import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from routers import chat, files, gmail, calendar, telegram, drive, tasks
from database.db import init_db
import uvicorn
from services.calendar_service import (
    calendar_service,
    CalendarAuthorizationError,
    CalendarConfigurationError
)

app = FastAPI(
    title="Limone Auto API",
    description="모듈형 AI 허브 - 채팅 + 대시보드",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "https://limone-auto.netlify.app",
        "https://api.limone.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙 (업로드된 파일들)
app.mount("/uploads", StaticFiles(directory="../uploads"), name="uploads")

# API 라우터 등록
app.include_router(chat.router, prefix="/api/chat", tags=["채팅"])
app.include_router(files.router, prefix="/api/files", tags=["파일"])
app.include_router(gmail.router, prefix="/api/gmail", tags=["Gmail"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(telegram.router, prefix="/api/telegram", tags=["Telegram"])
app.include_router(drive.router, prefix="/api/drive", tags=["Drive"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])

# WebSocket 연결 관리자
from websocket.chat_handler import ConnectionManager
manager = ConnectionManager()

@app.on_event("startup")
async def startup():
    init_db()
    print("\n" + "="*50)
    print("[START] Limone Auto Backend Started!")
    print("   - API: http://localhost:8000")
    print("   - Docs: http://localhost:8000/docs")
    print("="*50 + "\n")

@app.on_event("shutdown")
async def shutdown():
    print("\n" + "="*50)
    print("[STOP] Limone Auto Backend Shutdown")
    print("="*50 + "\n")

# WebSocket 엔드포인트
@app.websocket("/ws/chat/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Client {client_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast(f"Client {client_id} left the chat")

@app.get("/")
async def root():
    return {
        "message": "Limone Auto API v1.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/test-alive")
async def test_alive():
    """서버 생존 확인용 엔드포인트"""
    print("🔥 TEST ALIVE 엔드포인트 호출됨!", flush=True)
    return {"status": "server is alive", "timestamp": time.time()}


@app.get("/auth/google/calendar/callback", summary="Google Calendar OAuth 콜백")
async def calendar_oauth_callback_root(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None)
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google OAuth 오류: {error}")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth code가 누락되었습니다.")

    try:
        calendar_service.exchange_code_for_token(code=code, state=state)
    except CalendarConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except CalendarAuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    redirect_target = calendar_service.get_success_redirect()
    if redirect_target:
        redirect_url = f"{redirect_target.rstrip('/')}/?calendar_connected=true"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    return {"message": "Google Calendar 인증이 완료되었습니다."}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
