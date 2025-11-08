import logging
import re
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Any, Dict, Optional

from services.drive_service import (
    drive_service,
    DriveAuthorizationError,
    DriveAPIError,
)
from services.gmail_service import (
    gmail_service,
    GmailAuthorizationError,
    GmailAPIError,
)
from services.calendar_service import (
    calendar_service,
    CalendarAuthorizationError,
    CalendarAPIError,
)

logger = logging.getLogger(__name__)


class ChatIntent(Enum):
    """지원되는 챗봇 액션 의도 목록"""

    GENERAL = auto()
    DRIVE_LIST = auto()
    DRIVE_SEARCH = auto()
    DRIVE_UPLOAD = auto()
    GMAIL_LIST = auto()
    GMAIL_SEND = auto()
    CALENDAR_LIST = auto()
    CALENDAR_CREATE = auto()


class ChatActionRouter:
    """사용자 메시지를 분석해 적절한 액션을 실행하는 라우터."""

    DRIVE_KEYWORDS = ["드라이브", "drive", "파일", "문서"]
    GMAIL_KEYWORDS = ["메일", "이메일", "gmail", "편지"]
    CALENDAR_KEYWORDS = ["일정", "캘린더", "calendar", "스케줄", "약속"]

    def detect_intent(self, user_message: str) -> ChatIntent:
        text = user_message.lower()

        if any(keyword in text for keyword in self.DRIVE_KEYWORDS):
            if re.search(r"검색|찾아|search", text):
                return ChatIntent.DRIVE_SEARCH
            if re.search(r"업로드|저장", text):
                return ChatIntent.DRIVE_UPLOAD
            return ChatIntent.DRIVE_LIST

        if any(keyword in text for keyword in self.GMAIL_KEYWORDS):
            if re.search(r"보내|전송|reply|send", text):
                return ChatIntent.GMAIL_SEND
            return ChatIntent.GMAIL_LIST

        if any(keyword in text for keyword in self.CALENDAR_KEYWORDS):
            if re.search(r"등록|추가|create|예약", text):
                return ChatIntent.CALENDAR_CREATE
            return ChatIntent.CALENDAR_LIST

        return ChatIntent.GENERAL

    async def handle(self, user_message: str) -> Optional[Dict[str, Any]]:
        intent = self.detect_intent(user_message)
        if intent == ChatIntent.GENERAL:
            return None

        try:
            if intent == ChatIntent.DRIVE_LIST:
                return await self._handle_drive_list()
            if intent == ChatIntent.DRIVE_SEARCH:
                return await self._handle_drive_search(user_message)
            if intent == ChatIntent.DRIVE_UPLOAD:
                return self._handle_drive_upload_stub()
            if intent == ChatIntent.GMAIL_LIST:
                return await self._handle_gmail_list()
            if intent == ChatIntent.GMAIL_SEND:
                return await self._handle_gmail_send(user_message)
            if intent == ChatIntent.CALENDAR_LIST:
                return await self._handle_calendar_list()
            if intent == ChatIntent.CALENDAR_CREATE:
                return await self._handle_calendar_create(user_message)
        except (DriveAuthorizationError, GmailAuthorizationError, CalendarAuthorizationError) as exc:
            return {
                "type": "auth_required",
                "message": str(exc),
            }
        except (DriveAPIError, GmailAPIError, CalendarAPIError) as exc:
            logger.exception("Chat action execution failed")
            return {
                "type": "error",
                "message": str(exc),
            }
        except Exception as exc:  # pragma: no cover - 예기치 못한 오류 로깅용
            logger.exception("Unexpected chat action error")
            return {
                "type": "error",
                "message": f"액션 처리 중 오류가 발생했습니다: {exc}",
            }

        return None

    async def _handle_drive_list(self) -> Dict[str, Any]:
        files = await drive_service.list_files(page_size=5)
        items = [
            {
                "name": file.get("name"),
                "id": file.get("id"),
                "mimeType": file.get("mimeType"),
                "webViewLink": file.get("webViewLink"),
                "size": file.get("size"),
            }
            for file in files
        ]

        if not items:
            return {
                "type": "drive_list",
                "title": "Google Drive 파일",
                "message": "조건에 맞는 파일을 찾지 못했습니다.",
                "items": [],
            }

        return {
            "type": "drive_list",
            "title": "최근 Google Drive 파일",
            "items": items,
        }

    async def _handle_drive_search(self, user_message: str) -> Dict[str, Any]:
        query = self._extract_drive_query(user_message)
        if not query:
            return {
                "type": "drive_list",
                "title": "Google Drive 파일 검색",
                "message": "검색어를 찾지 못했습니다. 예: '드라이브에서 보고서 파일 찾아줘'",
                "items": [],
            }

        files = await drive_service.search_files(query=query, page_size=5)
        items = [
            {
                "name": file.get("name"),
                "id": file.get("id"),
                "mimeType": file.get("mimeType"),
                "webViewLink": file.get("webViewLink"),
                "size": file.get("size"),
            }
            for file in files
        ]

        if not items:
            return {
                "type": "drive_list",
                "title": "Google Drive 파일 검색",
                "message": f"'{query}' 검색 결과가 없습니다.",
                "items": [],
            }

        return {
            "type": "drive_list",
            "title": f"'{query}' 검색 결과",
            "items": items,
        }

    def _handle_drive_upload_stub(self) -> Dict[str, Any]:
        return {
            "type": "drive_upload",
            "title": "Google Drive 업로드",
            "message": "파일 업로드 기능은 준비 중입니다. 파일 업로드 화면을 활용해주세요.",
        }
    def _extract_drive_query(self, user_message: str) -> Optional[str]:
        lowered = user_message.lower()
        patterns = [
            r"드라이브(?:에서)?\s*(.+?)\s*(?:파일|문서)?\s*(?:찾|검색)",
            r"drive\s*(?:에서)?\s*(.+?)\s*(?:file)?\s*(?:find|search)",
            r"검색\s*(?:해줘|해주세요)?\s*(.+)",
            r"find\s*(.+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, user_message, re.IGNORECASE)
            if match:
                # 마지막 그룹의 텍스트를 검색어로 사용
                groups = [g for g in match.groups() if g]
                if groups:
                    return groups[-1].strip(" .,!?"")

        # 키워드 제거 후 남은 텍스트가 있다면 사용
        cleaned = user_message
        for keyword in self.DRIVE_KEYWORDS + ["검색", "찾아", "search", "find"]:
            cleaned = cleaned.replace(keyword, "")
        cleaned = cleaned.strip()
        return cleaned or None

    async def _handle_gmail_list(self) -> Dict[str, Any]:
        messages = await gmail_service.list_messages(max_results=5)
        items = []
        for message in messages:
            items.append({
                "id": message.get("id"),
                "subject": message.get("subject"),
                "from": message.get("from"),
                "snippet": message.get("snippet"),
                "date": message.get("date"),
            })

        return {
            "type": "gmail_list",
            "title": "최근 Gmail 메시지",
            "items": items,
        }

    async def _handle_gmail_send(self, user_message: str) -> Dict[str, Any]:
        parsed = self._parse_gmail_send(user_message)

        missing_fields = []
        if not parsed["recipients"]:
            missing_fields.append("recipients")
        if not parsed["subject"]:
            missing_fields.append("subject")
        if not parsed["body"]:
            missing_fields.append("body")
                "id": event.get("id"),
                "summary": event.get("summary"),
                "start": event.get("start"),
                "end": event.get("end"),
                "link": event.get("htmlLink"),
            })

        return {
            "type": "calendar_list",
            "title": "다가오는 일정",
            "items": items,
        }

    async def _handle_calendar_create(self, user_message: str) -> Dict[str, Any]:
        parsed = self._parse_calendar_create(user_message)

        missing_fields = []
        if not parsed.get("summary"):
            missing_fields.append("summary")
        if not parsed.get("start"):
            missing_fields.append("start")

        if missing_fields:
            return {
                "type": "calendar_create_prompt",
                "title": "Google Calendar 일정 등록",
                "message": "일정을 등록하려면 제목과 시작 시간을 알려주세요.",
                "missing": missing_fields,
                "detected": parsed,
            }

        try:
            timezone_str = parsed.get("timezone") or "Asia/Seoul"
            created = await calendar_service.create_event(
                summary=parsed["summary"],
                start=parsed["start"],
                end=parsed.get("end"),
                timezone_str=timezone_str,
                location=parsed.get("location"),
                description=parsed.get("description"),
            )
            return {
                "type": "calendar_create_result",
                "title": "Google Calendar 일정 등록 완료",
                "message": "일정을 캘린더에 등록했습니다.",
                "event": created,
            }
        except CalendarAuthorizationError as exc:
            return {
                "type": "auth_required",
                "message": str(exc),
            }
        except CalendarAPIError as exc:
            logger.exception("Calendar create failed")
            return {
                "type": "error",
                "message": str(exc),
            }

    def _parse_gmail_send(self, user_message: str) -> Dict[str, Any]:
        parsed: Dict[str, Any] = {
            "recipients": [],
            "cc": [],
            "bcc": [],
            "subject": None,
            "body": None,
        }

        # 이메일 주소 추출 (수신자 우선)
        emails = re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", user_message)
        if emails:
            parsed["recipients"] = list(dict.fromkeys(emails))  # 중복 제거

        subject_match = re.search(
            r"(?:제목|subject)\s*(?:은|을|:)?\s*['\"]([^'\"]+)['\"]",
            user_message,
            re.IGNORECASE,
        )
        if subject_match:
            parsed["subject"] = subject_match.group(1).strip()

        body_match = re.search(
            r"(?:내용|message|body)\s*(?:은|을|:)?\s*['\"]([^'\"]+)['\"]",
            user_message,
            re.IGNORECASE,
        )
        if body_match:
            parsed["body"] = body_match.group(1).strip()

        if not parsed["body"]:
            # '보내줘' 이전 또는 이후의 텍스트를 본문으로 시도
            send_split = re.split(r"보내줘|보내 주세요|send", user_message, flags=re.IGNORECASE)
            if len(send_split) >= 1:
                candidate = send_split[0]
                # 제목과 이메일 키워드 제거
                candidate = re.sub(r"(?:제목|subject)[^'\"]*['\"][^'\"]+['\"]", "", candidate, flags=re.IGNORECASE)
                candidate = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "", candidate)
                candidate = candidate.strip()
                if candidate:
                    parsed["body"] = candidate

        return parsed

    def _parse_calendar_create(self, user_message: str) -> Dict[str, Any]:
        summary = None
        start_iso = None
        end_iso = None

        now = datetime.now()
        date_candidate: Optional[datetime] = None

        # 날짜 파싱
        if "오늘" in user_message:
            date_candidate = now
        elif "내일" in user_message:
            date_candidate = now + timedelta(days=1)
        elif "모레" in user_message:
            date_candidate = now + timedelta(days=2)
        else:
            date_match = re.search(r"(\d{4})[./-](\d{1,2})[./-](\d{1,2})", user_message)
            if date_match:
                year, month, day = map(int, date_match.groups())
                date_candidate = datetime(year, month, day)
            else:
                month_day_match = re.search(r"(\d{1,2})월\s*(\d{1,2})일", user_message)
                if month_day_match:
                    month, day = map(int, month_day_match.groups())
                    year = now.year
                    date_candidate = datetime(year, month, day)

        time_candidate = None

        time_match = re.search(r"(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?", user_message)
        if time_match:
            period, hour_str, minute_str = time_match.groups()
            hour = int(hour_str)
            minute = int(minute_str) if minute_str else 0
            if period == "오후" and hour < 12:
                hour += 12
            if period == "오전" and hour == 12:
                hour = 0
            time_candidate = (hour, minute)
        else:
            ampm_match = re.search(r"(\d{1,2})(?:[:시](\d{2}))?\s*(am|pm)", user_message, re.IGNORECASE)
            if ampm_match:
                hour = int(ampm_match.group(1))
                minute = int(ampm_match.group(2)) if ampm_match.group(2) else 0
                period = ampm_match.group(3).lower()
                if period == "pm" and hour < 12:
                    hour += 12
                if period == "am" and hour == 12:
                    hour = 0
                time_candidate = (hour, minute)

        if date_candidate and time_candidate:
            start_dt = date_candidate.replace(hour=time_candidate[0], minute=time_candidate[1], second=0, microsecond=0)
            start_iso = start_dt.isoformat()
            end_dt = start_dt + timedelta(hours=1)
            end_iso = end_dt.isoformat()

        # 제목 파싱
        subject_match = re.search(r"(?:제목|subject)\s*(?:은|을|:)?\s*['\"]([^'\"]+)['\"]", user_message, re.IGNORECASE)
        if subject_match:
            summary = subject_match.group(1).strip()
        else:
            # 시간/날짜 관련 어구 제거 후 남은 텍스트를 요약으로 시도
            cleaned = user_message
            for token in [
                "일정", "등록", "추가", "잡아줘", "잡아 줘", "create", "schedule",
                "달력", "캘린더", "calendar", "예약", "해줘", "해주세요",
                "오늘", "내일", "모레",
            ] + self.CALENDAR_KEYWORDS:
                cleaned = cleaned.replace(token, "")

            cleaned = re.sub(r"\d{4}[./-]\d{1,2}[./-]\d{1,2}", "", cleaned)
            cleaned = re.sub(r"\d{1,2}월\s*\d{1,2}일", "", cleaned)
            cleaned = re.sub(r"(오전|오후)?\s*\d{1,2}시(\s*\d{1,2}분)?", "", cleaned)
            cleaned = re.sub(r"\d{1,2}(?:[:시]\d{2})?\s*(am|pm)", "", cleaned, flags=re.IGNORECASE)
            cleaned = cleaned.strip()
            if cleaned:
                summary = cleaned

        result = {
            "summary": summary,
            "start": start_iso,
        }

        if end_iso:
            result["end"] = end_iso

        return result


chat_action_router = ChatActionRouter()
