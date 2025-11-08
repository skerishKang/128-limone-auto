from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from services.gmail_service import (
    gmail_service,
    GmailAPIError,
    GmailAuthorizationError,
    GmailConfigurationError,
)


router = APIRouter()


class GmailMessageResponse(BaseModel):
    id: str
    threadId: Optional[str] = None
    snippet: Optional[str] = None
    internalDate: Optional[str] = None
    subject: Optional[str] = None
    from_: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None
    date: Optional[str] = None
    labelIds: List[str] = Field(default_factory=list)


class GmailMessageDetail(GmailMessageResponse):
    body: Optional[str] = None
    attachments: List[dict] = Field(default_factory=list)


class SendEmailRequest(BaseModel):
    to: List[str]
    subject: str
    body: str
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None


@router.get("/", summary="Gmail OAuth 상태")
async def gmail_root():
    return {
        "authorized": gmail_service.is_authorized(),
        "scopes": gmail_service.scopes,
    }


@router.get("/auth/google/gmail/start", summary="Gmail OAuth 인증 URL 생성")
async def start_gmail_oauth(
    auto_redirect: bool = Query(default=False, description="true면 Google OAuth 페이지로 즉시 리다이렉트")
):
    try:
        payload = gmail_service.generate_auth_url()
        if auto_redirect:
            return RedirectResponse(url=payload["authorization_url"], status_code=status.HTTP_302_FOUND)
        return payload
    except GmailConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.get("/auth/google/gmail/callback", summary="Gmail OAuth 콜백 처리")
async def gmail_oauth_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None)
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google OAuth 오류: {error}")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth code가 누락되었습니다.")

    try:
        gmail_service.exchange_code_for_token(code=code, state=state)
    except GmailConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    redirect_target = gmail_service.get_success_redirect()
    if redirect_target:
        redirect_url = f"{redirect_target.rstrip('/')}/?gmail_connected=true"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    return {"message": "Gmail 인증이 완료되었습니다."}


@router.get("/messages", summary="Gmail 메시지 목록", response_model=List[GmailMessageResponse])
async def list_messages(
    max_results: int = Query(default=10, ge=1, le=100),
    label_id: Optional[str] = Query(default=None),
    query: Optional[str] = Query(default=None)
):
    try:
        label_ids = [label_id] if label_id else None
        return await gmail_service.list_messages(max_results=max_results, label_ids=label_ids, query=query)
    except GmailAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except GmailAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/messages/send", summary="Gmail 메시지 전송")
async def send_message(payload: SendEmailRequest):
    try:
        result = await gmail_service.send_message(
            to=payload.to,
            subject=payload.subject,
            body=payload.body,
            cc=payload.cc,
            bcc=payload.bcc,
        )
        return {"message": "Gmail 메시지가 전송되었습니다.", "result": result}
    except GmailAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except GmailAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/messages/unread-count", summary="읽지 않은 메시지 수")
async def unread_count():
    try:
        count = await gmail_service.get_unread_count()
        return {"unread": count}
    except GmailAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except GmailAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/messages/{message_id}", summary="Gmail 메시지 상세", response_model=GmailMessageDetail)
async def get_message(message_id: str):
    try:
        return await gmail_service.get_message(message_id=message_id)
    except GmailAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except GmailAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
