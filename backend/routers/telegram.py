from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/")
async def telegram_root():
    return {"message": "Telegram API - Coming Soon"}

@router.get("/messages")
async def get_messages():
    # TODO: Telegram Bot API 연동
    raise HTTPException(status_code=501, detail="Telegram integration not implemented yet")

@router.post("/send")
async def send_message():
    # TODO: 텔레그램 메시지 발송
    raise HTTPException(status_code=501, detail="Telegram integration not implemented yet")
