from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/")
async def calendar_root():
    return {"message": "Calendar API - Coming Soon"}

@router.get("/events")
async def get_events():
    # TODO: Google Calendar API 연동
    raise HTTPException(status_code=501, detail="Calendar integration not implemented yet")

@router.post("/events")
async def create_event():
    # TODO: 캘린더 이벤트 생성
    raise HTTPException(status_code=501, detail="Calendar integration not implemented yet")
