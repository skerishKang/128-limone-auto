from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import chat, files, gmail, calendar, telegram, drive
from database.db import init_db
import uvicorn

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

# WebSocket 연결 관리자
from websocket.chat_handler import ConnectionManager
manager = ConnectionManager()

@app.on_event("startup")
async def startup():
    init_db()
    print("\n" + "="*50)
    print("🚀 Limone Auto Backend Started!")
    print("   - API: http://localhost:8000")
    print("   - Docs: http://localhost:8000/docs")
    print("="*50 + "\n")

@app.on_event("shutdown")
async def shutdown():
    print("\n" + "="*50)
    print("🛑 Limone Auto Backend Shutdown")
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

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
