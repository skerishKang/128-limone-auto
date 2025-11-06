from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    """
    WebSocket 연결 관리자
    - 클라이언트 연결/해제 관리
    - 메시지 브로드캐스트
    """
    
    def __init__(self):
        # 활성 연결 저장: {client_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # 클라이언트 정보: {client_id: {name, connected_at}}
        self.client_info: Dict[str, Dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """클라이언트 연결 수락"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_info[client_id] = {
            "name": f"Client_{client_id}",
            "connected_at": datetime.now().isoformat()
        }
        
        # 연결 알림
        await self.broadcast_system_message(
            f"👤 {self.client_info[client_id]['name']} joined the chat"
        )
        print(f"✅ Client {client_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        """클라이언트 연결 해제"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
        if client_id in self.client_info:
            client_name = self.client_info[client_id]["name"]
            del self.client_info[client_id]
            
            # 연결 종료 알림
            print(f"❌ Client {client_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, client_id: str):
        """특정 클라이언트에게 개인 메시지 전송"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                print(f"❌ Failed to send personal message to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: str):
        """모든 연결된 클라이언트에게 메시지 브로드캐스트"""
        disconnected_clients = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"❌ Failed to send to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # 실패한 연결 제거
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def broadcast_system_message(self, message: str):
        """시스템 메시지 브로드캐스트 (포맷팅 포함)"""
        system_msg = {
            "type": "system",
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(system_msg, ensure_ascii=False))

    async def broadcast_typing_indicator(self, client_id: str, is_typing: bool):
        """타이핑 인디케이터 브로드캐스트"""
        indicator = {
            "type": "typing",
            "client_id": client_id,
            "is_typing": is_typing,
            "timestamp": datetime.now().isoformat()
        }
        
        # 타이핑 중인 클라이언트 제외하고 브로드캐스트
        for cid in self.active_connections.keys():
            if cid != client_id:
                await self.send_personal_message(
                    json.dumps(indicator, ensure_ascii=False),
                    cid
                )

    def get_connection_count(self) -> int:
        """현재 연결된 클라이언트 수"""
        return len(self.active_connections)

    def get_client_list(self) -> List[Dict]:
        """연결된 클라이언트 목록"""
        return [
            {
                "client_id": client_id,
                **info
            }
            for client_id, info in self.client_info.items()
        ]

# 전역 인스턴스 (main.py에서 사용)
manager = ConnectionManager()
