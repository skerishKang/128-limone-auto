import logging
import re
from datetime import datetime, date, timedelta, timezone
from enum import Enum, auto
from typing import Any, Dict, Optional, List

from database.db import (
    get_conversation,
    get_messages,
    get_messages_for_user_on_date,
    save_conversation_memory,
    save_daily_summary,
)
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
from services.gemini_router import GeminiService

logger = logging.getLogger(__name__)


class ChatIntent(Enum):
    """지원되는 챗봇 액션 의도 목록"""

    GENERAL = auto()
    CONVERSATION_SUMMARY = auto()
    DAILY_SUMMARY = auto()
    AUDIO_TRANSCRIBE = auto()
    DRIVE_LIST = auto()
    DRIVE_SEARCH = auto()
    DRIVE_UPLOAD = auto()
    GMAIL_LIST = auto()
    GMAIL_SEND = auto()
    CALENDAR_LIST = auto()
    CALENDAR_CREATE = auto()


class ChatActionRouter:
    """사용자 메시지를 분석해 적절한 액션을 실행하는 라우터."""

    TRANSCRIBE_KEYWORDS = ["전사", "받아쓰기", "transcribe", "음성 변환", "듣고 써줘", "음성 전사"]
    SUMMARY_KEYWORDS = ["요약", "정리", "summary"]
    DAILY_KEYWORDS = ["오늘", "일일", "daily", "하루", "today"]
    DRIVE_KEYWORDS = ["드라이브", "drive", "구글 드라이브", "문서"]
    GMAIL_KEYWORDS = ["메일", "이메일", "gmail", "편지"]
    CALENDAR_KEYWORDS = ["일정", "캘린더", "calendar", "스케줄", "약속"]

    def __init__(self) -> None:
        self.gemini_service = GeminiService()

    def detect_intent(self, user_message: str) -> ChatIntent:
        text = user_message.lower()

        if any(keyword in text for keyword in self.TRANSCRIBE_KEYWORDS):
            return ChatIntent.AUDIO_TRANSCRIBE

        if any(keyword in text for keyword in self.SUMMARY_KEYWORDS):
            if any(keyword in text for keyword in self.DAILY_KEYWORDS):
                return ChatIntent.DAILY_SUMMARY
            return ChatIntent.CONVERSATION_SUMMARY

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

    def _handle_audio_transcribe(self) -> Dict[str, Any]:
        return {
            "type": "audio_transcribe_guide",
            "message": (
                "오디오 전사를 진행하려면 📁 파일 탭으로 이동해 음성 파일을 업로드해주세요."
                " 업로드가 완료되면 AI가 자동으로 전사를 제공합니다."
            ),
            "action": {
                "label": "파일 업로드로 이동",
                "route": "/files"
            }
        }

    async def handle(self, user_message: str, conversation_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        intent = self.detect_intent(user_message)
        if intent == ChatIntent.GENERAL:
            return None

        try:
            if intent == ChatIntent.CONVERSATION_SUMMARY:
                if conversation_id is None:
                    return {
                        "type": "error",
                        "message": "대화 요약을 위해서는 현재 대화 정보가 필요합니다.",
                    }
                return await self._handle_conversation_summary(conversation_id)
            if intent == ChatIntent.DAILY_SUMMARY:
                if conversation_id is None:
                    return {
                        "type": "error",
                        "message": "일일 요약을 위해서는 기준이 되는 대화가 필요합니다.",
                    }
                return await self._handle_daily_summary(user_message, conversation_id)
            if intent == ChatIntent.AUDIO_TRANSCRIBE:
                return self._handle_audio_transcribe()
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

    async def _handle_conversation_summary(
        self,
        conversation_id: int,
        *,
        created_by: str = "user_command",
        trigger: str = "manual",
    ) -> Dict[str, Any]:
        conversation = get_conversation(conversation_id)
        if not conversation:
            return {
                "type": "conversation_summary",
                "message": "대화 정보를 찾지 못했습니다.",
                "conversation_id": conversation_id,
            }

        user_id = conversation.get("user_id", "default_user")
        title = conversation.get("title") or f"대화 #{conversation_id}"

        messages = get_messages(conversation_id)
        if not messages:
            return {
                "type": "conversation_summary",
                "title": title,
                "message": "요약할 대화 메시지가 없습니다.",
                "conversation_id": conversation_id,
            }

        formatted_dialogue = self._format_conversation_messages(messages)

        system_instruction = (
            "당신은 대화 요약 비서입니다. 주어진 대화를 요약하고, 핵심 포인트를 항목으로 정리하세요."
            " 사용자에게 도움이 될 만한 후속 액션이 있다면 마지막 줄에 '추천: ...' 형식으로 제안하세요."
        )
        prompt = (
            "다음은 사용자와 AI 사이의 대화입니다. 중요한 사실, 결정, 요청 위주로 요약해 주세요.\n"
            "---\n"
            f"{formatted_dialogue}\n"
            "---\n"
            "출력 형식:\n"
            "1. 한 문장 요약\n2. 핵심 포인트 3~5개 (불릿)\n3. 필요 시 후속 제안"
        )

        summary_text = await self.gemini_service.generate_text(prompt, system_instruction=system_instruction)

        metadata = {
            "message_count": len(messages),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "trigger": trigger,
        }
        tags = self._extract_tags_from_summary(summary_text)
        importance = self._estimate_importance(summary_text)
        followups = self._derive_followups(tags, summary_text)
        metadata["followups"] = followups
        saved = save_conversation_memory(
            conversation_id=conversation_id,
            user_id=user_id,
            content=summary_text,
            title=title,
            metadata=metadata,
            tags=tags,
            importance=importance,
            created_by=created_by,
        )

        return {
            "type": "conversation_summary",
            "title": title,
            "summary": summary_text,
            "conversation_id": conversation_id,
            "memory_id": saved.get("id"),
            "created_at": saved.get("created_at"),
            "tags": saved.get("tags"),
            "importance": saved.get("importance"),
            "followups": followups,
        }

    async def _handle_daily_summary(
        self,
        user_message: str,
        conversation_id: int,
        *,
        created_by: str = "user_command",
        target_date: Optional[date] = None,
        trigger: str = "manual",
    ) -> Dict[str, Any]:
        conversation = get_conversation(conversation_id)
        if not conversation:
            return {
                "type": "daily_summary",
                "message": "사용자 정보를 찾지 못했습니다.",
            }

        user_id = conversation.get("user_id", "default_user")
        resolved_date = target_date or self._parse_summary_date(user_message)
        if resolved_date is None:
            resolved_date = datetime.now().date()

        messages = get_messages_for_user_on_date(user_id, resolved_date)
        if not messages:
            return {
                "type": "daily_summary",
                "summary_date": resolved_date.isoformat(),
                "message": "해당 날짜에 요약할 메시지가 없습니다.",
            }

        formatted_messages = self._format_daily_messages(messages)

        system_instruction = (
            "당신은 개인 비서입니다. 하루 동안의 대화를 요약하고 중요한 할 일이나 결정 사항을 정리하세요."
            " 가능하면 긍정적인 마무리 문장을 덧붙이세요."
        )
        prompt = (
            f"다음은 {resolved_date.isoformat()} 동안의 사용자와 AI 대화 기록입니다.\n"
            "각 대화의 맥락을 유지하며 핵심 내용을 요약하고, 행동 아이템이 있다면 목록으로 작성해주세요.\n"
            "---\n"
            f"{formatted_messages}\n"
            "---\n출력 형식:\n1. 하루 요약 (2~3문장)\n2. 행동 아이템 목록 (있을 때만)\n3. 격려 또는 마무리 문장"
        )

        summary_text = await self.gemini_service.generate_text(prompt, system_instruction=system_instruction)

        metadata = {
            "message_count": len(messages),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "trigger": trigger,
        }
        tags = self._extract_tags_from_summary(summary_text)
        importance = self._estimate_importance(summary_text)
        followups = self._derive_followups(tags, summary_text)
        metadata["followups"] = followups
        saved = save_daily_summary(
            user_id=user_id,
            summary_date=resolved_date,
            content=summary_text,
            metadata=metadata,
            tags=tags,
            importance=importance,
            created_by=created_by,
        )

        return {
            "type": "daily_summary",
            "summary_date": resolved_date.isoformat(),
            "summary": summary_text,
            "record_id": saved.get("id"),
            "created_at": saved.get("created_at"),
            "tags": saved.get("tags"),
            "importance": saved.get("importance"),
            "followups": followups,
        }

    def _extract_tags_from_summary(self, summary_text: str) -> List[str]:
        tags: List[str] = []
        lowered = summary_text.lower()
        keyword_map = {
            "회의": ["meeting", "회의", "미팅"],
            "업무": ["work", "업무", "작업"],
            "일정": ["schedule", "일정", "캘린더"],
            "이메일": ["email", "메일"],
            "파일": ["file", "파일", "문서"],
        }
        for tag, keywords in keyword_map.items():
            if any(keyword in lowered for keyword in keywords):
                tags.append(tag)
        if not tags:
            tags.append("일반")
        return tags

    def _estimate_importance(self, summary_text: str) -> int:
        lowered = summary_text.lower()
        high_keywords = ["긴급", "urgent", "중요", "기한", "deadline"]
        medium_keywords = ["확인", "follow", "검토", "review"]
        if any(keyword in lowered for keyword in high_keywords):
            return 5
        if any(keyword in lowered for keyword in medium_keywords):
            return 4
        return 3

    def _derive_followups(self, tags: List[str], summary_text: str) -> List[Dict[str, str]]:
        followups: List[Dict[str, str]] = []

        tag_to_followup = {
            "회의": {
                "label": "회의 요약 공유",
                "suggestion": "회의 내용을 정리해서 메일로 보내줘",
            },
            "이메일": {
                "label": "이메일 작성",
                "suggestion": "요약을 참고해서 메일 초안 작성해줘",
            },
            "일정": {
                "label": "캘린더 일정 등록",
                "suggestion": "요약 기반으로 캘린더 일정 만들어줘",
            },
            "파일": {
                "label": "관련 파일 검색",
                "suggestion": "요약과 관련된 최근 파일 찾아줘",
            },
            "업무": {
                "label": "할 일 정리",
                "suggestion": "요약 내용을 바탕으로 해야 할 작업 리스트 만들어줘",
            },
        }

        added_labels = set()
        for tag in tags:
            follow = tag_to_followup.get(tag)
            if follow and follow["label"] not in added_labels:
                followups.append(follow)
                added_labels.add(follow["label"])

        lowered = summary_text.lower()
        keyword_followups = [
            ("보고서", "보고서 작성 도와줘", "보고서 작성"),
            ("정리", "중요 포인트만 다시 정리해줘", "핵심 정리"),
        ]
        for keyword, suggestion, label in keyword_followups:
            if keyword in lowered and label not in added_labels:
                followups.append({"label": label, "suggestion": suggestion})
                added_labels.add(label)

        return followups

    def _format_conversation_messages(self, messages: List[Dict[str, Any]], limit: int = 50) -> str:
        lines: List[str] = []
        for msg in messages[-limit:]:
            role = "사용자" if msg.get("role") == "user" else "AI"
            content = msg.get("content", "").strip()
            if content:
                lines.append(f"{role}: {content}")
        return "\n".join(lines)

    def _format_daily_messages(self, messages: List[Dict[str, Any]], limit: int = 120) -> str:
        lines: List[str] = []
        for msg in messages[:limit]:
            convo = msg.get("conversations") or {}
            title = convo.get("title") or f"대화 #{msg.get('conversation_id')}"
            role = "사용자" if msg.get("role") == "user" else "AI"
            created_at = msg.get("created_at")
            try:
                timestamp = datetime.fromisoformat(created_at.replace("Z", "+00:00")) if isinstance(created_at, str) else None
            except ValueError:
                timestamp = None
            timestamp_text = timestamp.astimezone(timezone.utc).isoformat() if timestamp else str(created_at)
            content = msg.get("content", "").strip()
            if content:
                lines.append(f"[{title}] {role} @ {timestamp_text}: {content}")
        return "\n".join(lines)

    def _parse_summary_date(self, user_message: str) -> Optional[date]:
        lowered = user_message.lower()
        today = datetime.now().date()

        if "오늘" in lowered or "today" in lowered:
            return today
        if "어제" in lowered or "yesterday" in lowered:
            return today - timedelta(days=1)
        if "그저께" in lowered:
            return today - timedelta(days=2)

        date_match = re.search(r"(\d{4})[./-](\d{1,2})[./-](\d{1,2})", user_message)
        if date_match:
            year, month, day = map(int, date_match.groups())
            return date(year, month, day)

        month_day_match = re.search(r"(\d{1,2})월\s*(\d{1,2})일", user_message)
        if month_day_match:
            month, day = map(int, month_day_match.groups())
            year = today.year
            return date(year, month, day)

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
                    return groups[-1].strip(" .,!?")

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

        if missing_fields:
            return {
                "type": "gmail_send_prompt",
                "title": "Gmail 메시지 보내기",
                "message": "메시지를 보낼 수 없습니다. 다음 필드를 확인해주세요: " + ", ".join(missing_fields),
                "detected": parsed,
            }

        try:
            await gmail_service.send_message(parsed["recipients"], parsed["subject"], parsed["body"])
            return {
                "type": "gmail_send_result",
                "title": "Gmail 메시지 보내기 성공",
                "message": "메시지를 성공적으로 보냈습니다.",
            }
        except GmailAuthorizationError as exc:
            return {
                "type": "auth_required",
                "message": str(exc),
            }
        except GmailAPIError as exc:
            logger.exception("Gmail send failed")
            return {
                "type": "error",
                "message": str(exc),
            }

    async def _handle_calendar_list(self) -> Dict[str, Any]:
        events = await calendar_service.get_events(max_results=10)
        items = []
        for event in events:
            items.append({
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
