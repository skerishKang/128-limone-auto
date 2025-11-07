import io
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse

from services.drive_service import (
    drive_service,
    DriveAPIError,
    DriveAuthorizationError,
    DriveConfigurationError,
)


router = APIRouter()


@router.get("/auth/google/drive/start", summary="Google Drive OAuth 인증 URL 생성")
async def start_drive_oauth(
    auto_redirect: bool = Query(default=False, description="true로 지정하면 바로 Google OAuth 페이지로 리다이렉트")
):
    try:
        payload = drive_service.generate_auth_url()
        if auto_redirect:
            return RedirectResponse(url=payload["authorization_url"], status_code=status.HTTP_302_FOUND)
        return payload
    except DriveConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.get("/auth/google/drive/callback", summary="Google Drive OAuth 콜백 처리")
async def drive_oauth_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google OAuth 오류: {error}")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth code가 누락되었습니다.")

    try:
        drive_service.exchange_code_for_token(code=code, state=state)
    except DriveConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except DriveAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    redirect_target = drive_service.get_success_redirect()
    if redirect_target:
        redirect_url = f"{redirect_target.rstrip('/')}/?drive_connected=true"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    return {"message": "Google Drive 인증이 완료되었습니다."}


@router.get("/status", summary="Google Drive 인증 상태")
async def drive_status():
    return {"authorized": drive_service.is_authorized()}


@router.get("/files", summary="Google Drive 파일 목록 조회")
async def list_drive_files(page_size: int = Query(default=20, ge=1, le=100)):
    try:
        files = await drive_service.list_files(page_size=page_size)
        return {"files": files}
    except DriveAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except DriveAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/quota", summary="Google Drive 저장소 사용량")
async def drive_quota():
    try:
        quota = await drive_service.get_storage_quota()
        return quota
    except DriveAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except DriveAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/upload", summary="Google Drive 파일 업로드")
async def upload_drive_file(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Query(default=None, description="업로드 대상 폴더 ID"),
):
    try:
        file_bytes = await file.read()
        stream = io.BytesIO(file_bytes)
        result = await drive_service.upload_file(
            stream=stream,
            filename=file.filename,
            mime_type=file.content_type,
            folder_id=folder_id,
        )
        return {
            "message": "Google Drive 업로드가 완료되었습니다.",
            "file": result,
        }
    except DriveAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except DriveAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.delete("/files/{file_id}", summary="Google Drive 파일 삭제")
async def delete_drive_file(file_id: str):
    try:
        result = await drive_service.delete_file(file_id=file_id)
        return result
    except DriveAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except DriveAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
