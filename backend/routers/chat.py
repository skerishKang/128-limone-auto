import json
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import (
    create_conversation,
    get_conversation,
    list_conversations,
    add_message,
    get_messages,
    delete_conversation
)
from services.gemini_router import GeminiService
from services.chat_action_router import chat_action_router


router = APIRouter()

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

@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: int, data: MessageCreate):
    """메시지 전송 및 AI 응답 생성"""
    try:
        # 사용자 메시지 저장
        user_msg_id = add_message(
            conversation_id=conversation_id,
            role="user",
            content=data.content
        )

        # AI 응답 생성 - Gemini API 연동
        ai_response, metadata = await generate_ai_response(conversation_id, data.content)
        
        # AI 응답 저장
        ai_msg_id = add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_response,
            metadata=json.dumps(metadata, ensure_ascii=False) if metadata else None
        )

        return {
            "user_message_id": user_msg_id,
            "ai_message_id": ai_msg_id,
            "response": ai_response,
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@router.delete("/conversations/{conversation_id}")
async def delete_chat_conversation(conversation_id: int):
    """대화 삭제"""
    try:
        delete_conversation(conversation_id)
        return {"message": "Conversation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

async def generate_ai_response(conversation_id: int, user_message: str) -> tuple[str, Optional[Dict[str, Any]]]:
    """AI 응답 생성 - Gemini API 연동"""
    try:
        # 1. 액션 라우터로 의도 파악 및 실행
        action_result = await chat_action_router.handle(user_message)
        if action_result:
            return _format_action_result(action_result), action_result

        # 2. 일반 대화는 Gemini로 처리
        # GeminiService 인스턴스 생성
        gemini_service = GeminiService()

        # 대화 히스토리 조회
        messages = get_messages(conversation_id)

        # 시스템 프롬프트
        system_instruction = """당신은 Limone AI입니다. 사용자에게 친절하고helpful한 도움을 제공하세요.
다음 특징을 가지세요:
- 친근하고 전문적인 톤으로 대화
- 한국어로 응답 (필요시 영어도 섞어서)
- 질문에 대한 명확한 답변 제공
- Limone 프로젝트의 모든 기능에 대해 잘 알고 있음"""

        # 대화 히스토리를 프롬프트로 구성
        conversation_history = ""
        for msg in messages[-10:]:  # 최근 10개 메시지만 사용 (토큰 절약)
            role = msg['role']
            content = msg['content']
            if role == 'user':
                conversation_history += f"사용자: {content}\n"
            elif role == 'assistant':
                conversation_history += f"AI: {content}\n"

        # 현재 사용자 메시지 추가
        current_prompt = f"{conversation_history}사용자: {user_message}\nAI:"

        # Gemini API 호출
        response = await gemini_service.generate_text(
            prompt=current_prompt,
            system_instruction=system_instruction
        )

        return response, None

    except Exception as e:
        # 오류 발생 시 더미 응답 반환
        print(f"Gemini API error: {e}")
        fallback_responses = [
            "죄송해요, 지금은 일시적인 오류가 발생했어요. 다시 시도해주세요! 😅",
            "AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "시스템 점검 중입니다.，稍後 다시 시도해 주세요!"
        ]
        import random
        return random.choice(fallback_responses), None


def _format_action_result(result: Dict[str, Any]) -> str:
    action_type = result.get("type")

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
