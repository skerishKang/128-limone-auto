from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.telegram_service import telegram_service

router = APIRouter()


@router.get("/status", summary="텔레그램 연결 상태 확인")
async def telegram_status():
    if telegram_service is None:
        return {"connected": False, "reason": "TELEGRAM_BOT_TOKEN 미설정"}
    try:
        updates = await telegram_service.get_updates(limit=1)
        return {"connected": True, "latest_update_id": updates[0]["update_id"] if updates else None}
    except RuntimeError as exc:
        detail = str(exc)
        if "Unauthorized" in detail:
            return {"connected": False, "reason": "Telegram Bot API 인증 실패 (Unauthorized)"}
        return {"connected": False, "reason": detail}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Telegram 상태 확인 실패: {exc}") from exc


@router.get("/messages", summary="최근 텔레그램 메시지 조회")
async def get_messages(limit: int = 10):
    if telegram_service is None:
        raise HTTPException(status_code=503, detail="Telegram bot token is not configured")
    try:
        return await telegram_service.get_messages(max_results=limit)
    except RuntimeError as exc:
        detail = str(exc)
        if "Unauthorized" in detail:
            raise HTTPException(status_code=503, detail="Telegram Bot API 인증 실패 (Unauthorized)") from exc
        raise HTTPException(status_code=503, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Telegram 메시지 조회 실패: {exc}") from exc


class TelegramMessagePayload(BaseModel):
    chat_id: str = Field(..., description="메시지를 보낼 Chat ID")
    text: str = Field(..., min_length=1, description="보낼 메시지")
    parse_mode: Optional[str] = Field(default="Markdown")


@router.post("/send", summary="텔레그램 메시지 발송")
async def send_message(payload: TelegramMessagePayload):
    if telegram_service is None:
        raise HTTPException(status_code=503, detail="Telegram bot token is not configured")
    try:
        result = await telegram_service.send_message(
            chat_id=payload.chat_id,
            text=payload.text,
            parse_mode=payload.parse_mode or "Markdown"
        )
        return {"success": True, "result": result.get("result")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Telegram 메시지 발송 실패: {exc}") from exc
