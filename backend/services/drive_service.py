import io
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Set, BinaryIO

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload


logger = logging.getLogger(__name__)


class DriveConfigurationError(Exception):
    """Google Drive 연동 환경 설정 오류."""


class DriveAuthorizationError(Exception):
    """Google Drive 인증이 필요한 경우 발생."""


class DriveAPIError(Exception):
    """Google Drive API 호출 실패."""


AUTH_STATE_STORE: Set[str] = set()


class DriveService:
    """Google Drive API 서비스."""

    def __init__(self) -> None:
        self.scopes = self._parse_scopes(
            os.getenv(
                "GOOGLE_DRIVE_SCOPES",
                "https://www.googleapis.com/auth/drive.file"
            )
        )
        self.redirect_uri = os.getenv(
            "GOOGLE_DRIVE_REDIRECT_URI",
            "http://localhost:8000/auth/google/drive/callback"
        )
        self.success_redirect = os.getenv(
            "GOOGLE_OAUTH_SUCCESS_REDIRECT",
            "http://localhost:3000"
        )
        self.client_secret_path = self._resolve_client_secret_path(
            os.getenv("GOOGLE_OAUTH_CLIENT_SECRET_PATH")
        )
        self.token_path = self._resolve_token_path(
            os.getenv("GOOGLE_DRIVE_TOKEN_PATH")
        )
        self.parent_folder_id = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID")

    # =============================================================
    # OAuth 플로우
    # =============================================================

    def generate_auth_url(self) -> Dict[str, str]:
        """OAuth 인증 URL 생성."""

        flow = self._build_flow()
        authorization_url, state = flow.authorization_url()
        AUTH_STATE_STORE.add(state)
        return {"authorization_url": authorization_url, "state": state}

    def exchange_code_for_token(self, code: str, state: Optional[str]) -> Credentials:
        """OAuth code로 토큰 교환 후 저장."""

        if state and state not in AUTH_STATE_STORE:
            raise DriveAuthorizationError("유효하지 않은 OAuth state 값입니다.")

        flow = self._build_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        self._store_credentials(credentials)

        if state and state in AUTH_STATE_STORE:
            AUTH_STATE_STORE.discard(state)

        return credentials

    def is_authorized(self) -> bool:
        """사용자가 이미 인증되었는지 확인."""
        return self._load_credentials() is not None

    def get_success_redirect(self) -> Optional[str]:
        """인증 완료 후 리디렉션할 URL."""
        return self.success_redirect

    # =============================================================
    # Drive API 액션
    # =============================================================

    async def list_files(self, page_size: int = 20) -> List[Dict]:
        """Google Drive 파일 목록 조회."""

        credentials = self._load_credentials()
        if not credentials:
            raise DriveAuthorizationError("Google Drive 인증이 필요합니다.")

        try:
            service = build(
                "drive",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            response = (
                service.files()
                .list(
                    pageSize=page_size,
                    orderBy="modifiedTime desc",
                    fields=(
                        "files(id,name,mimeType,size,createdTime,modifiedTime,"
                        "webViewLink,webContentLink,iconLink,owners(displayName,emailAddress))"
                    )
                )
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Drive API 파일 목록 조회 실패")
            raise DriveAPIError("Google Drive 파일 목록을 가져오지 못했습니다.") from exc

        files = response.get("files", [])
        normalized: List[Dict] = []
        for item in files:
            normalized.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "mimeType": item.get("mimeType"),
                "size": int(item.get("size", 0)) if item.get("size") else 0,
                "createdTime": item.get("createdTime"),
                "modifiedTime": item.get("modifiedTime"),
                "webViewLink": item.get("webViewLink"),
                "webContentLink": item.get("webContentLink"),
                "iconLink": item.get("iconLink"),
                "owners": item.get("owners", []),
            })

        return normalized

    async def search_files(self, query: str, page_size: int = 20) -> List[Dict]:
        """쿼리로 Google Drive 파일 검색."""

        credentials = self._load_credentials()
        if not credentials:
            raise DriveAuthorizationError("Google Drive 인증이 필요합니다.")

        try:
            service = build(
                "drive",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            q = (
                f"name contains '{query.replace('\'', '\\'')}'"
                " and trashed = false"
            )
            response = (
                service.files()
                .list(
                    q=q,
                    pageSize=page_size,
                    orderBy="modifiedTime desc",
                    fields=(
                        "files(id,name,mimeType,size,createdTime,modifiedTime,"
                        "webViewLink,webContentLink,iconLink)"
                    )
                )
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Drive API 파일 검색 실패")
            raise DriveAPIError("Google Drive 파일 검색 중 오류가 발생했습니다.") from exc

        files = response.get("files", [])
        normalized: List[Dict] = []
        for item in files:
            normalized.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "mimeType": item.get("mimeType"),
                "size": int(item.get("size", 0)) if item.get("size") else 0,
                "createdTime": item.get("createdTime"),
                "modifiedTime": item.get("modifiedTime"),
                "webViewLink": item.get("webViewLink"),
                "webContentLink": item.get("webContentLink"),
                "iconLink": item.get("iconLink"),
            })

        return normalized

    async def upload_file(
        self,
        stream: BinaryIO,
        filename: str,
        mime_type: Optional[str] = None,
        folder_id: Optional[str] = None,
    ) -> Dict:
        """파일 업로드."""

        credentials = self._load_credentials()
        if not credentials:
            raise DriveAuthorizationError("Google Drive 인증이 필요합니다.")

        try:
            service = build(
                "drive",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            metadata: Dict[str, object] = {"name": filename}
            parent = folder_id or self.parent_folder_id
            if parent:
                metadata["parents"] = [parent]

            media = MediaIoBaseUpload(
                stream,
                mimetype=mime_type or "application/octet-stream",
                resumable=False
            )

            created = (
                service.files()
                .create(
                    body=metadata,
                    media_body=media,
                    fields="id,name,mimeType,size,webViewLink,webContentLink"
                )
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Drive 파일 업로드 실패")
            raise DriveAPIError("Google Drive 파일 업로드 중 오류가 발생했습니다.") from exc

        return {
            "id": created.get("id"),
            "name": created.get("name"),
            "mimeType": created.get("mimeType"),
            "size": int(created.get("size", 0)) if created.get("size") else 0,
            "webViewLink": created.get("webViewLink"),
            "webContentLink": created.get("webContentLink"),
        }

    async def delete_file(self, file_id: str) -> Dict[str, str]:
        """파일 삭제."""

        credentials = self._load_credentials()
        if not credentials:
            raise DriveAuthorizationError("Google Drive 인증이 필요합니다.")

        try:
            service = build(
                "drive",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            service.files().delete(fileId=file_id).execute()
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Drive 파일 삭제 실패")
            raise DriveAPIError("Google Drive 파일 삭제 중 오류가 발생했습니다.") from exc

        return {"status": "deleted", "file_id": file_id}

    async def get_storage_quota(self) -> Dict[str, int]:
        """저장소 사용량."""

        credentials = self._load_credentials()
        if not credentials:
            raise DriveAuthorizationError("Google Drive 인증이 필요합니다.")

        try:
            service = build(
                "drive",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            about = service.about().get(fields="storageQuota").execute()
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Drive 저장소 정보 조회 실패")
            raise DriveAPIError("Google Drive 저장소 정보를 가져오지 못했습니다.") from exc

        quota = about.get("storageQuota", {})
        return {
            "limit": int(quota.get("limit", 0)) if quota.get("limit") else 0,
            "usage": int(quota.get("usage", 0)) if quota.get("usage") else 0,
            "usageInDrive": int(quota.get("usageInDrive", 0)) if quota.get("usageInDrive") else 0,
            "usageInDriveTrash": int(quota.get("usageInDriveTrash", 0)) if quota.get("usageInDriveTrash") else 0,
        }

    # =============================================================
    # 내부 헬퍼
    # =============================================================

    def _parse_scopes(self, raw: str) -> List[str]:
        return [scope.strip() for scope in raw.split(",") if scope.strip()]

    def _resolve_client_secret_path(self, explicit: Optional[str]) -> Path:
        if explicit:
            candidate = Path(explicit)
            if candidate.exists():
                return candidate
            raise DriveConfigurationError(
                "지정한 GOOGLE_OAUTH_CLIENT_SECRET_PATH 파일을 찾을 수 없습니다."
            )

        project_root = Path(__file__).resolve().parents[2]
        matches = sorted(
            project_root.glob("client_secret_*.json"),
            key=lambda path: path.stat().st_mtime,
            reverse=True
        )
        if matches:
            return matches[0]

        raise DriveConfigurationError(
            "client_secret_*.json 파일을 프로젝트 루트에 위치시키거나 "
            "환경변수 GOOGLE_OAUTH_CLIENT_SECRET_PATH를 설정해주세요."
        )

    def _resolve_token_path(self, explicit: Optional[str]) -> Path:
        if explicit:
            return Path(explicit)

        default_dir = Path(__file__).resolve().parent.parent / "credentials"
        default_dir.mkdir(parents=True, exist_ok=True)
        return default_dir / "drive_token.json"

    def _build_flow(self, state: Optional[str] = None) -> Flow:
        return Flow.from_client_secrets_file(
            str(self.client_secret_path),
            scopes=self.scopes,
            redirect_uri=self.redirect_uri,
            state=state
        )

    def _store_credentials(self, credentials: Credentials) -> None:
        self.token_path.parent.mkdir(parents=True, exist_ok=True)
        self.token_path.write_text(credentials.to_json(), encoding="utf-8")

    def _load_credentials(self) -> Optional[Credentials]:
        if not self.token_path.exists():
            return None

        credentials = Credentials.from_authorized_user_file(
            str(self.token_path),
            self.scopes
        )

        if credentials and credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                self._store_credentials(credentials)
            except Exception:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
                logger.exception("Google Drive 인증 토큰 갱신 실패")
                return None

        return credentials


drive_service = DriveService()
