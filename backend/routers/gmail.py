from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class EmptyResponse(BaseModel):
    message: str = "Not implemented yet"

@router.get("/")
async def gmail_root():
    return {"message": "Gmail API - Coming Soon"}

@router.get("/emails")
async def get_emails():
    # TODO: Gmail API 연동
    raise HTTPException(status_code=501, detail="Gmail integration not implemented yet")

@router.post("/send")
async def send_email():
    # TODO: Gmail 발송
    raise HTTPException(status_code=501, detail="Gmail integration not implemented yet")
