import asyncio
import json
import logging
import sys
import time
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import (
    create_conversation,
    get_conversation,
    list_conversations,
    add_message,
    get_messages,
    delete_conversation,
    list_conversation_memories,
    list_daily_summaries,
    get_latest_conversation_memory,
    get_daily_summary_by_date,
)
from services.gemini_router import GeminiService
from services.chat_action_router import chat_action_router


router = APIRouter()
logger = logging.getLogger(__name__)

AUTO_CONVERSATION_SUMMARY_INTERVAL = 20
SEOUL_TZ = ZoneInfo("Asia/Seoul")

# Pydantic 스키마
class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class MessageCreate(BaseModel):
    content: str
    role: str = "user"  # 'user' or 'assistant'

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    metadata: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationMemoryResponse(BaseModel):
    id: str
    conversation_id: int
    user_id: str
    title: Optional[str] = None
    content: str
    created_by: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: Optional[List[str]] = None
    importance: Optional[int] = None


class DailySummaryResponse(BaseModel):
    id: str
    user_id: str
    summary_date: date
    content: str
    created_by: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: Optional[List[str]] = None
    importance: Optional[int] = None


class ConversationResponse(BaseModel):
    id: int
    title: str
    user_id: str
    created_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

# API 엔드포인트

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations():
    """대화 목록 조회"""
    try:
        conversations = list_conversations()
        return [dict(conv) for conv in conversations]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversations: {str(e)}")

@router.post("/conversations", response_model=ConversationResponse)
async def create_new_conversation(data: ConversationCreate):
    """새 대화 생성"""
    try:
        conv_id = create_conversation(title=data.title or "New Chat")
        conversation = get_conversation(conv_id)
        return dict(conversation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation_detail(conversation_id: int):
    """특정 대화 조회"""
    conversation = get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return dict(conversation)

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(conversation_id: int):
    """대화 메시지 목록 조회"""
    try:
        messages = get_messages(conversation_id)
        return [dict(msg) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")

@router.get("/conversations/{conversation_id}/memories", response_model=List[ConversationMemoryResponse])
async def get_conversation_memories(conversation_id: int, limit: int = 10):
    """특정 대화의 요약 메모리 목록 조회"""
    try:
        memories = list_conversation_memories(conversation_id, limit=limit)
        return memories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversation memories: {str(e)}")

@router.get("/summaries/daily", response_model=List[DailySummaryResponse])
async def get_daily_summaries(user_id: str, limit: int = 7):
    """사용자의 최근 일일 요약 목록 조회"""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id는 필수입니다.")

    try:
        summaries = list_daily_summaries(user_id, limit=limit)
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch daily summaries: {str(e)}")

@router.get("/summaries/daily/latest", response_model=Optional[DailySummaryResponse])
async def get_latest_daily_summary(user_id: str):
    """사용자의 최신 일일 요약 조회"""
    summaries = await get_daily_summaries(user_id=user_id, limit=1)
    return summaries[0] if summaries else None

@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, data: MessageCreate):
    """메시지 전송 및 AI 응답 생성"""
    print(f"\n{'=' * 60}", flush=True)
    print(f"[CHAT] 메시지 전송 시작 - conversation_id: {conversation_id}", flush=True)
    print(f"[CHAT] 내용: {data.content[:50]}...", flush=True)
    print(f"[CHAT] 타임스탬프: {time.time()}", flush=True)
    print(f"{'=' * 60}\n", flush=True)

    try:
        print("[CHAT] DB: add_message 호출...", flush=True)
        user_msg_id = add_message(
            conversation_id=conversation_id,
            role="user",
            content=data.content
        )
        print(f"[CHAT] DB: 사용자 메시지 저장 완료 (ID: {user_msg_id})", flush=True)

        print("[CHAT] DB: get_messages 호출...", flush=True)
        messages = get_messages(conversation_id)
        print(f"[CHAT] DB: 메시지 {len(messages)}개 조회 완료", flush=True)

        print("[CHAT] AI 응답 생성 시작...", flush=True)
        ai_response, metadata = generate_ai_response(conversation_id, data.content, messages)
        print(f"[CHAT] AI 응답 생성 완료 (길이: {len(ai_response)})", flush=True)

        print("[CHAT] DB: AI 메시지 저장...", flush=True)
        ai_msg_id = add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_response,
            metadata=json.dumps(metadata, ensure_ascii=False) if metadata else None
        )
        print(f"[CHAT] DB: AI 메시지 저장 완료 (ID: {ai_msg_id})", flush=True)

        result = {
            "user_message_id": user_msg_id,
            "ai_message_id": ai_msg_id,
            "response": ai_response,
            "metadata": metadata
        }
        print(f"[CHAT] 응답 반환: {result}\n", flush=True)
        return result
    except Exception as e:
        print(f"[CHAT] 예외 발생: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@router.delete("/conversations/{conversation_id}")
async def delete_chat_conversation(conversation_id: int):
    """대화 삭제"""
    try:
        delete_conversation(conversation_id)
        return {"message": "Conversation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

def generate_ai_response(
    conversation_id: int,
    user_message: str,
    messages: Optional[List[Dict[str, Any]]] = None,
) -> tuple[str, Optional[Dict[str, Any]]]:
    """AI 응답 생성 - Gemini API 연동"""
    print(f"\n[AI] generate_ai_response 시작 - conversation_id: {conversation_id}", flush=True)

    try:
        print("[AI] chat_action_router.handle 호출...", flush=True)
        action_result = asyncio.run(chat_action_router.handle(user_message, conversation_id=conversation_id))
        print(f"[AI] chat_action_router.handle 반환: {action_result}", flush=True)

        if messages is None:
            print("[AI] DB: get_messages 호출 (내부)", flush=True)
            messages = get_messages(conversation_id)
        print(f"[AI] 메시지 히스토리 확보: {len(messages)}개", flush=True)

        print("[AI] 자동 요약 트리거 호출...", flush=True)
        auto_events = asyncio.run(_auto_generate_summaries(conversation_id, messages))
        print(f"[AI] 자동 요약 결과: {len(auto_events)}개", flush=True)

        if action_result:
            print("[AI] 액션 결과 존재 → Gemini 호출 생략", flush=True)
            metadata = dict(action_result)
            metadata["auto_summaries"] = auto_events
            metadata["auto_summary_count"] = len(auto_events)
            formatted = _format_action_result(action_result)
            print(f"[AI] 액션 결과 포맷 완료 (길이: {len(formatted)})", flush=True)
            return formatted, metadata

        print("[AI] GeminiService 인스턴스 생성...", flush=True)
        gemini_service = GeminiService()

        system_instruction = """당신은 Limone AI입니다. 사용자에게 친절하고helpful한 도움을 제공하세요.
다음 특징을 가지세요:
- 친근하고 전문적인 톤으로 대화
- 한국어로 응답 (필요시 영어도 섞어서)
- 질문에 대한 명확한 답변 제공
- Limone 프로젝트의 모든 기능에 대해 잘 알고 있음"""

        conversation_history = ""
        for msg in messages[-10:]:  # 최근 10개 메시지만 사용해 토큰 절약
            role = msg.get('role')
            content = msg.get('content')
            if role == 'user':
                conversation_history += f"사용자: {content}\n"
            elif role == 'assistant':
                conversation_history += f"AI: {content}\n"

        current_prompt = f"{conversation_history}사용자: {user_message}\nAI:"

        print("[AI] Gemini.generate_text 호출...", flush=True)
        ai_response = asyncio.run(gemini_service.generate_text(
            prompt=current_prompt,
            system_instruction=system_instruction
        ))
        print(f"[AI] Gemini 응답 완료 (길이: {len(ai_response)})", flush=True)

        metadata: Dict[str, Any] = {
            "auto_summaries": auto_events,
            "auto_summary_count": len(auto_events),
        }

        return ai_response, metadata
    except Exception as e:
        print(f"[AI] 예외 발생: {e}", flush=True)
        import traceback
        traceback.print_exc()
        fallback_responses = [
            "죄송해요, 현재 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요!",
            "앗! 무언가 잘못됐어요. 다시 시도해 보시겠어요?",
            "시스템 점검 중입니다.，稍後 다시 시도해 주세요!"
        ]
        import random
        fallback = random.choice(fallback_responses)
        print("[AI] 폴백 응답 반환", flush=True)
        return fallback, None


def _format_action_result(result: Dict[str, Any]) -> str:
    action_type = result.get("type")

    if action_type == "conversation_summary":
        title = result.get("title") or "대화 요약"
        summary = result.get("summary")
        message = result.get("message")
        if summary:
            lines = [f"📝 {title}", summary]
            memory_id = result.get("memory_id")
            created_at = result.get("created_at")
            if memory_id:
                lines.append(f"저장 ID: {memory_id}")
            if created_at:
                lines.append(f"생성 시각: {created_at}")
            return "\n".join(lines)
        if message:
            return f"📝 {title}\n{message}"
        return f"📝 {title}"

    if action_type == "daily_summary":
        summary_date = result.get("summary_date")
        summary = result.get("summary")
        message = result.get("message")
        header = "📅 일일 요약" + (f" ({summary_date})" if summary_date else "")
        if summary:
            lines = [header, summary]
            record_id = result.get("record_id")
            created_at = result.get("created_at")
            if record_id:
                lines.append(f"저장 ID: {record_id}")
            if created_at:
                lines.append(f"생성 시각: {created_at}")
            return "\n".join(lines)
        if message:
            return f"{header}\n{message}"
        return header

    if action_type == "drive_list":
        title = result.get("title", "Google Drive 파일")
        items = result.get("items", [])
        if not items:
            return f"📁 {title}\n조건에 맞는 파일을 찾지 못했습니다."
        lines = [f"📁 {title}"]
        for item in items:
            name = item.get("name", "(이름 없음)")
            link = item.get("webViewLink") or "링크 없음"
            size = item.get("size")
            size_text = f" ({size} bytes)" if size else ""
            lines.append(f"- {name}{size_text}" + (f" → {link}" if link != "링크 없음" else ""))
        return "\n".join(lines)

    if action_type == "gmail_list":
        title = result.get("title", "Gmail 메시지")
        items = result.get("items", [])
        if not items:
            return f"📧 {title}\n표시할 메시지가 없습니다."
        lines = [f"📧 {title}"]
        for item in items:
            subject = item.get("subject") or "(제목 없음)"
            sender = item.get("from") or "발신자 미상"
            snippet = item.get("snippet") or "요약 없음"
            lines.append(f"- {subject} / {sender}\n  {snippet}")
        return "\n".join(lines)

    if action_type == "calendar_list":
        title = result.get("title", "다가오는 일정")
        items = result.get("items", [])
        if not items:
            return f"🗓️ {title}\n예정된 일정이 없습니다."
        lines = [f"🗓️ {title}"]
        for item in items:
            summary = item.get("summary") or "(제목 없음)"
            start = item.get("start") or "시작 시간 미정"
            end = item.get("end") or "종료 시간 미정"
            lines.append(f"- {summary} ({start} ~ {end})")
        return "\n".join(lines)

    if action_type == "auth_required":
        return f"🔐 {result.get('message', '해당 서비스를 사용하려면 인증이 필요합니다.')}"

    if action_type == "error":
        return f"⚠️ {result.get('message', '액션 실행 중 오류가 발생했습니다.')}"

    return str(result)


async def _auto_generate_summaries(conversation_id: int, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    generated: List[Dict[str, Any]] = []

    conversation = get_conversation(conversation_id)
    if not conversation:
        return generated

    user_id = conversation.get("user_id", "default_user")
    message_count = len(messages)

    latest_memory = get_latest_conversation_memory(conversation_id)
    last_count = None
    if latest_memory:
        metadata = _ensure_dict(latest_memory.get("metadata"))
        last_count = metadata.get("message_count") if isinstance(metadata, dict) else None

    should_conversation_summary = False
    if message_count >= AUTO_CONVERSATION_SUMMARY_INTERVAL:
        if last_count is None:
            should_conversation_summary = True
        else:
            if message_count - last_count >= AUTO_CONVERSATION_SUMMARY_INTERVAL:
                should_conversation_summary = True

    if should_conversation_summary:
        result = await chat_action_router._handle_conversation_summary(  # pylint: disable=protected-access
            conversation_id,
            created_by="auto_trigger",
            trigger="auto_threshold",
        )
        if result and result.get("summary"):
            generated.append({**result, "auto": True, "auto_trigger": "auto_threshold"})

    # 일일 요약 자동 생성: 하루가 지나고 아직 요약이 없는 경우
    now_seoul = datetime.now(SEOUL_TZ)
    yesterday = now_seoul.date() - timedelta(days=1)

    has_messages_yesterday = any(
        _convert_to_seoul_date(msg.get("created_at")) == yesterday for msg in messages
    )

    if has_messages_yesterday:
        existing_daily = get_daily_summary_by_date(user_id, yesterday)
        if not existing_daily:
            result = await chat_action_router._handle_daily_summary(  # pylint: disable=protected-access
                user_message="",
                conversation_id=conversation_id,
                created_by="auto_trigger",
                target_date=yesterday,
                trigger="auto_missing_daily",
            )
            if result and result.get("summary"):
                generated.append({**result, "auto": True, "auto_trigger": "auto_missing_daily"})

    return generated


def _convert_to_seoul_date(value: Any) -> Optional[date]:
    timestamp = _parse_datetime(value)
    if not timestamp:
        return None
    return timestamp.astimezone(SEOUL_TZ).date()


def _parse_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(value, datetime):
        return value
    return None


def _ensure_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return {}
