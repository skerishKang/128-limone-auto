from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from services.calendar_service import (
    calendar_service,
    CalendarAPIError,
    CalendarAuthorizationError,
    CalendarConfigurationError
)


router = APIRouter()


@router.get("/", summary="캘린더 API 상태")
async def calendar_root():
    return {
        "authorized": calendar_service.is_authorized(),
        "scopes": calendar_service.scopes
    }


@router.get("/auth/google/calendar/start", summary="Google OAuth 인증 URL 생성")
async def start_calendar_oauth():
    try:
        auth_payload = calendar_service.generate_auth_url()
    except CalendarConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return auth_payload


@router.get("/auth/google/calendar/callback", summary="Google OAuth 콜백 처리")
async def calendar_oauth_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None)
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google OAuth 오류: {error}")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth code가 누락되었습니다.")

    try:
        calendar_service.exchange_code_for_token(code=code, state=state)
    except CalendarConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except CalendarAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    redirect_target = calendar_service.get_success_redirect()
    if redirect_target:
        redirect_url = f"{redirect_target.rstrip('/')}/?calendar_connected=true"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    return {"message": "Google Calendar 인증이 완료되었습니다."}


@router.get("/events", summary="Google Calendar 이벤트 조회")
async def get_events(max_results: int = Query(default=10, ge=1, le=100)):
    try:
        events = await calendar_service.get_events(max_results=max_results)
        return {"items": events}
    except CalendarAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except CalendarAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/events", summary="Google Calendar 이벤트 생성")
async def create_event():
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="이벤트 생성은 아직 구현되지 않았습니다.")
