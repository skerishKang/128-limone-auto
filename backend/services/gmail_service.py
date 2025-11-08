import base64
import logging
import os
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Dict, List, Optional, Sequence

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


logger = logging.getLogger(__name__)


class GmailConfigurationError(Exception):
    """Gmail 연동 환경 설정 오류."""


class GmailAuthorizationError(Exception):
    """Gmail 인증이 필요한 경우 발생."""


class GmailAPIError(Exception):
    """Gmail API 호출 실패."""


class GmailService:
    """Gmail API 서비스."""

    def __init__(self) -> None:
        self.scopes = self._parse_scopes(
            os.getenv(
                "GOOGLE_GMAIL_SCOPES",
                "https://www.googleapis.com/auth/gmail.readonly,"
                "https://www.googleapis.com/auth/gmail.modify,"
                "https://www.googleapis.com/auth/gmail.send"
            )
        )
        self.redirect_uri = os.getenv(
            "GOOGLE_GMAIL_REDIRECT_URI",
            "http://localhost:8000/api/gmail/auth/google/callback"
        )
        self.success_redirect = os.getenv(
            "GOOGLE_OAUTH_SUCCESS_REDIRECT",
            "http://localhost:3000"
        )
        self.client_secret_path = self._resolve_client_secret_path(
            os.getenv("GOOGLE_OAUTH_CLIENT_SECRET_PATH")
        )
        self.token_path = self._resolve_token_path(
            os.getenv("GOOGLE_GMAIL_TOKEN_PATH")
        )

    # =============================================================
    # OAuth 관련 메서드
    # =============================================================

    def generate_auth_url(self) -> Dict[str, str]:
        """OAuth 인증 URL 생성."""

        flow = self._build_flow()
        authorization_url, state = flow.authorization_url()
        return {"authorization_url": authorization_url, "state": state}

    def exchange_code_for_token(self, code: str, state: Optional[str]) -> Credentials:
        """OAuth code로 토큰 교환 후 저장."""

        flow = self._build_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        self._store_credentials(credentials)
        return credentials

    def is_authorized(self) -> bool:
        """사용자가 이미 Gmail 인증을 완료했는지 확인."""
        return self._load_credentials() is not None

    def get_success_redirect(self) -> Optional[str]:
        """인증 완료 후 리디렉션할 URL."""
        return self.success_redirect

    # =============================================================
    # Gmail API 호출
    # =============================================================

    async def list_messages(
        self,
        max_results: int = 10,
        label_ids: Optional[Sequence[str]] = None,
        query: Optional[str] = None
    ) -> List[Dict]:
        """Gmail 메시지 목록 조회."""

        service = self._build_service()

        try:
            response = (
                service.users()
                .messages()
                .list(
                    userId="me",
                    maxResults=max_results,
                    labelIds=list(label_ids) if label_ids else None,
                    q=query
                )
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Gmail 메시지 목록 조회 실패")
            raise GmailAPIError("Gmail 메시지 목록을 가져오지 못했습니다.") from exc

        messages = response.get("messages", [])
        results: List[Dict] = []
        for item in messages:
            try:
                detail = (
                    service.users()
                    .messages()
                    .get(userId="me", id=item.get("id"), format="metadata")
                    .execute()
                )
            except HttpError:  # pragma: no cover - 개별 메시지 오류는 건너뜀
                continue

            results.append(self._normalize_message_summary(detail))

        return results

    async def get_message(self, message_id: str) -> Dict:
        """Gmail 메시지 상세 조회."""

        service = self._build_service()

        try:
            message = (
                service.users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Gmail 메시지 상세 조회 실패")
            raise GmailAPIError("Gmail 메시지를 가져오지 못했습니다.") from exc

        return self._normalize_message_full(message)

    async def send_message(
        self,
        to: Sequence[str],
        subject: str,
        body: str,
        cc: Optional[Sequence[str]] = None,
        bcc: Optional[Sequence[str]] = None,
    ) -> Dict:
        """Gmail 메시지 전송."""

        service = self._build_service()

        message = EmailMessage()
        message["To"] = ", ".join(to)
        if cc:
            message["Cc"] = ", ".join(cc)
        if bcc:
            message["Bcc"] = ", ".join(bcc)
        message["Subject"] = subject
        message["Date"] = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")
        message.set_content(body)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

        try:
            sent = (
                service.users()
                .messages()
                .send(userId="me", body={"raw": raw})
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Gmail 메시지 전송 실패")
            raise GmailAPIError("Gmail 메시지 전송 중 오류가 발생했습니다.") from exc

        return {
            "id": sent.get("id"),
            "threadId": sent.get("threadId"),
            "labelIds": sent.get("labelIds", []),
        }

    async def get_unread_count(self) -> int:
        """읽지 않은 메시지 수."""

        service = self._build_service()

        try:
            labels = (
                service.users()
                .labels()
                .get(userId="me", id="INBOX")
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Gmail 라벨 조회 실패")
            raise GmailAPIError("Gmail 라벨 정보를 가져오지 못했습니다.") from exc

        # Gmail 웹 UI는 기본적으로 스레드(대화) 단위로 미열람 숫자를 표시하므로
        # threadsUnread 값을 우선 사용하고, 없을 경우 messagesUnread를 폴백으로 사용합니다.
        return labels.get("threadsUnread") or labels.get("messagesUnread", 0)

    # =============================================================
    # 내부 헬퍼 메서드
    # =============================================================

    def _build_service(self):
        credentials = self._load_credentials()
        if not credentials:
            raise GmailAuthorizationError("Gmail 인증이 필요합니다.")

        try:
            return build("gmail", "v1", credentials=credentials, cache_discovery=False)
        except HttpError as exc:  # pragma: no cover
            logger.exception("Gmail 서비스 초기화 실패")
            raise GmailAPIError("Gmail 서비스 초기화 중 오류가 발생했습니다.") from exc

    def _parse_scopes(self, raw: str) -> List[str]:
        return [scope.strip() for scope in raw.split(",") if scope.strip()]

    def _resolve_client_secret_path(self, explicit: Optional[str]) -> Path:
        if explicit:
            candidate = Path(explicit)
            if candidate.exists():
                return candidate
            raise GmailConfigurationError(
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

        raise GmailConfigurationError(
            "client_secret_*.json 파일을 프로젝트 루트에 위치시키거나 "
            "환경변수 GOOGLE_OAUTH_CLIENT_SECRET_PATH를 설정해주세요."
        )

    def _resolve_token_path(self, explicit: Optional[str]) -> Path:
        if explicit:
            return Path(explicit)

        default_dir = Path(__file__).resolve().parent.parent / "credentials"
        default_dir.mkdir(parents=True, exist_ok=True)
        return default_dir / "gmail_token.json"

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
                logger.exception("Gmail 인증 토큰 갱신 실패")
                return None

        return credentials

    def _normalize_message_summary(self, message: Dict) -> Dict:
        headers = message.get("payload", {}).get("headers", [])
        header_map = {header.get("name"): header.get("value") for header in headers}

        return {
            "id": message.get("id"),
            "threadId": message.get("threadId"),
            "snippet": message.get("snippet"),
            "internalDate": message.get("internalDate"),
            "subject": header_map.get("Subject"),
            "from": header_map.get("From"),
            "to": header_map.get("To"),
            "date": header_map.get("Date"),
            "labelIds": message.get("labelIds", []),
        }

    def _normalize_message_full(self, message: Dict) -> Dict:
        summary = self._normalize_message_summary(message)
        payload = message.get("payload", {})
        parts = payload.get("parts", [])
        body_data = payload.get("body", {}).get("data")

        decoded_body = None
        if body_data:
            decoded_body = base64.urlsafe_b64decode(body_data.encode("utf-8")).decode("utf-8", errors="ignore")
        else:
            decoded_body = self._extract_body_from_parts(parts)

        summary.update({
            "body": decoded_body,
            "attachments": self._extract_attachments(parts),
        })
        return summary

    def _extract_body_from_parts(self, parts: List[Dict]) -> Optional[str]:
        for part in parts or []:
            mime_type = part.get("mimeType", "")
            if mime_type == "text/plain" and part.get("body", {}).get("data"):
                return base64.urlsafe_b64decode(part["body"]["data"].encode("utf-8")).decode("utf-8", errors="ignore")

            if "parts" in part:
                nested = self._extract_body_from_parts(part.get("parts", []))
                if nested:
                    return nested
        return None

    def _extract_attachments(self, parts: List[Dict]) -> List[Dict]:
        attachments: List[Dict] = []
        for part in parts or []:
            body = part.get("body", {})
            if part.get("filename") and body.get("attachmentId"):
                attachments.append({
                    "filename": part.get("filename"),
                    "mimeType": part.get("mimeType"),
                    "attachmentId": body.get("attachmentId"),
                    "size": body.get("size")
                })

            if "parts" in part:
                attachments.extend(self._extract_attachments(part.get("parts", [])))

        return attachments


gmail_service = GmailService()
