import os
import logging
from typing import List, Dict, Optional, Set
from datetime import datetime, timezone
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


logger = logging.getLogger(__name__)


class CalendarConfigurationError(Exception):
    """캘린더 연동 환경 설정 오류."""


class CalendarAuthorizationError(Exception):
    """캘린더 인증이 필요한 경우 발생."""


class CalendarAPIError(Exception):
    """Google Calendar API 호출 실패."""


AUTH_STATE_STORE: Set[str] = set()


class CalendarService:
    """Google Calendar API 서비스."""

    def __init__(self) -> None:
        self.scopes = self._parse_scopes(
            os.getenv(
                "GOOGLE_OAUTH_SCOPES",
                "https://www.googleapis.com/auth/calendar.readonly"
            )
        )
        self.redirect_uri = os.getenv(
            "GOOGLE_OAUTH_REDIRECT_URI",
            "http://localhost:8000/auth/google/calendar/callback"
        )
        self.success_redirect = os.getenv(
            "GOOGLE_OAUTH_SUCCESS_REDIRECT",
            "http://localhost:3000"
        )
        self.calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "primary")
        self.client_secret_path = self._initial_client_secret_path(
            os.getenv("GOOGLE_OAUTH_CLIENT_SECRET_PATH")
        )
        self.token_path = self._resolve_token_path(
            os.getenv("GOOGLE_CALENDAR_TOKEN_PATH")
        )

    async def get_events(self, max_results: int = 10) -> List[Dict]:
        """Google Calendar 이벤트 조회."""

        credentials = self._load_credentials()
        if not credentials:
            raise CalendarAuthorizationError("Google Calendar 인증이 필요합니다.")

        try:
            service = build(
                "calendar",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            now = datetime.utcnow().isoformat() + "Z"
            events_result = (
                service.events()
                .list(
                    calendarId=self.calendar_id,
                    timeMin=now,
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy="startTime"
                )
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Calendar API 호출 실패")
            raise CalendarAPIError("Google Calendar API 호출 중 오류가 발생했습니다.") from exc

        items = events_result.get("items", [])
        normalized: List[Dict] = []
        for item in items:
            start = item.get("start", {})
            end = item.get("end", {})
            normalized.append({
                "id": item.get("id"),
                "summary": item.get("summary"),
                "description": item.get("description"),
                "start": start.get("dateTime") or start.get("date"),
                "end": end.get("dateTime") or end.get("date"),
                "timeZone": start.get("timeZone"),
                "location": item.get("location"),
                "attendees": item.get("attendees", []),
                "htmlLink": item.get("htmlLink")
            })

        return normalized

    async def create_event(self, summary: str, start: str, end: Optional[str] = None, timezone_str: Optional[str] = None, location: Optional[str] = None, description: Optional[str] = None) -> Dict:
        """Google Calendar에 이벤트 생성."""

        credentials = self._load_credentials()
        if not credentials:
            raise CalendarAuthorizationError("Google Calendar 인증이 필요합니다.")

        if not summary:
            raise CalendarAPIError("이벤트 제목이 필요합니다.")
        if not start:
            raise CalendarAPIError("이벤트 시작 시간이 필요합니다.")

        event_body: Dict[str, Any] = {
            "summary": summary,
        }

        if description:
            event_body["description"] = description
        if location:
            event_body["location"] = location

        if timezone_str:
            event_body["start"] = {
                "dateTime": start,
                "timeZone": timezone_str,
            }
            event_body["end"] = {
                "dateTime": end or start,
                "timeZone": timezone_str,
            }
        else:
            event_body["start"] = {
                "dateTime": start,
            }
            event_body["end"] = {
                "dateTime": end or start,
            }

        try:
            service = build(
                "calendar",
                "v3",
                credentials=credentials,
                cache_discovery=False
            )
            created_event = (
                service.events()
                .insert(
                    calendarId=self.calendar_id,
                    body=event_body
                )
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - 네트워크 오류는 런타임에서 확인
            logger.exception("Google Calendar 이벤트 생성 실패")
            raise CalendarAPIError("Google Calendar 이벤트 생성 중 오류가 발생했습니다.") from exc

        return {
            "id": created_event.get("id"),
            "summary": created_event.get("summary"),
            "start": created_event.get("start"),
            "end": created_event.get("end"),
            "htmlLink": created_event.get("htmlLink"),
        }

    async def get_today_events(self) -> int:
        """오늘 일정 수."""
        try:
            events = await self.get_events(max_results=25)
        except CalendarAuthorizationError:
            return 0

        today = datetime.now(timezone.utc).astimezone().date()
        count = 0
        for event in events:
            start_raw = event.get("start")
            if not start_raw:
                continue
            start_dt = self._parse_datetime(start_raw)
            if start_dt and start_dt.date() == today:
                count += 1
        return count

    def generate_auth_url(self) -> Dict[str, str]:
        """OAuth 인증 URL 생성."""

        flow = self._build_flow()
        authorization_url, state = flow.authorization_url()
        AUTH_STATE_STORE.add(state)
        return {"authorization_url": authorization_url, "state": state}

    def exchange_code_for_token(self, code: str, state: Optional[str]) -> Credentials:
        """OAuth code로 토큰 교환 후 저장."""

        if state and state not in AUTH_STATE_STORE:
            raise CalendarAuthorizationError("유효하지 않은 OAuth state 값입니다.")

        flow = self._build_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        self._store_credentials(credentials)

        if state and state in AUTH_STATE_STORE:
            AUTH_STATE_STORE.discard(state)

        return credentials

    def is_authorized(self) -> bool:
        """사용자가 이미 인증되었는지 확인."""
        creds = self._load_credentials()
        return creds is not None

    def get_success_redirect(self) -> Optional[str]:
        """인증 완료 후 리디렉션할 URL."""
        return self.success_redirect

    # =============================================================
    # 내부 헬퍼 메서드
    # =============================================================

    def _parse_scopes(self, raw: str) -> List[str]:
        return [scope.strip() for scope in raw.split(",") if scope.strip()]

    def _initial_client_secret_path(self, explicit: Optional[str]) -> Optional[Path]:
        if explicit:
            candidate = Path(explicit)
            return candidate if candidate.exists() else None

        project_root = Path(__file__).resolve().parents[2]
        matches = sorted(
            project_root.glob("client_secret_*.json"),
            key=lambda path: path.stat().st_mtime,
            reverse=True
        )
        if matches:
            return matches[0]
        return None

    def _resolve_token_path(self, explicit: Optional[str]) -> Path:
        if explicit:
            return Path(explicit)
        default_dir = Path(__file__).resolve().parent.parent / "credentials"
        return default_dir / "calendar_token.json"

    def _get_client_secret_path(self) -> Path:
        if self.client_secret_path and Path(self.client_secret_path).exists():
            return Path(self.client_secret_path)
        raise CalendarConfigurationError(
            "Google OAuth client secret 파일을 찾을 수 없습니다. "
            "환경변수 GOOGLE_OAUTH_CLIENT_SECRET_PATH를 설정하거나 "
            "client_secret_*.json 파일을 프로젝트 루트에 위치시켜 주세요."
        )

    def _build_flow(self, state: Optional[str] = None) -> Flow:
        client_secret_path = self._get_client_secret_path()
        return Flow.from_client_secrets_file(
            str(client_secret_path),
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
                logger.exception("Google Calendar 인증 토큰 갱신 실패")
                return None

        return credentials

    def _parse_datetime(self, value: str) -> Optional[datetime]:
        try:
            if value.endswith("Z"):
                value = value.replace("Z", "+00:00")
            return datetime.fromisoformat(value)
        except ValueError:
            logger.debug("ISO 날짜 변환 실패: %s", value)
            return None


# 전역 인스턴스
calendar_service = CalendarService()
