from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from database.db import (
    create_conversation,
    get_conversation,
    list_conversations,
    add_message,
    get_messages,
    delete_conversation
)

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

        # AI 응답 생성 (간단한 예시 - 실제 구현에서는 Gemini API 호출)
        ai_response = await generate_ai_response(data.content)
        
        # AI 응답 저장
        ai_msg_id = add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_response
        )

        return {
            "user_message_id": user_msg_id,
            "ai_message_id": ai_msg_id,
            "response": ai_response
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

async def generate_ai_response(user_message: str) -> str:
    """AI 응답 생성 (Gemini API 연동 예정)"""
    # TODO: Gemini API 연동
    # 현재는 더미 응답
    responses = [
        "안녕하세요! Limone AI입니다. 어떻게 도와드릴까요?",
        " интересный вопрос! 더 자세한 내용을 알려주시겠어요?",
        "좋은 생각이에요! 더 자세히 탐색해보면 좋겠어요.",
        "AI powered by Limone 🚀 다음 단계는 무엇이 좋을까요?"
    ]
    
    import random
    return random.choice(responses)
