import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

import httpx
from httpx import HTTPStatusError
from dotenv import load_dotenv


ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=False)


class TelegramService:
    """Telegram Bot API 연동"""

    def __init__(self, bot_token: Optional[str] = None) -> None:
        token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            raise RuntimeError("TELEGRAM_BOT_TOKEN 환경 변수가 설정되지 않았습니다.")
        if "your-telegram-bot-token" in token:
            print("[Telegram] 경고: 기본 예시 토큰이 감지되었습니다. .env 설정을 확인하세요.", flush=True)
        self.bot_token = token
        self.api_base = f"https://api.telegram.org/bot{self.bot_token}"
        self.session = httpx.AsyncClient(timeout=10.0)
        print("[Telegram] 서비스 초기화", flush=True)
        print(f"[Telegram] 사용 API Base = {self.api_base[:60]}...", flush=True)

    async def _request(self, method: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.api_base}/{method}"
        print(f"[Telegram] GET 호출: {url} params={payload}", flush=True)
        try:
            response = await self.session.get(url, params=payload or {})
            response.raise_for_status()
        except HTTPStatusError as exc:
            status = exc.response.status_code
            text = exc.response.text
            print(f"[Telegram] HTTP 오류 {status}: {text}", flush=True)
            raise RuntimeError(f"Telegram API HTTP 오류 {status}: {text}") from exc
        data = response.json()
        if not data.get("ok", False):
            raise RuntimeError(f"Telegram API 오류 ({method}): {data}")
        return data

    async def get_updates(self, limit: int = 20) -> List[Dict[str, Any]]:
        response = await self._request("getUpdates", {"limit": limit})
        return response.get("result", [])

    async def get_messages(self, max_results: int = 10) -> List[Dict[str, Any]]:
        updates = await self.get_updates(limit=max_results)
        messages: List[Dict[str, Any]] = []
        for update in updates:
            message = update.get("message") or update.get("channel_post")
            if not message:
                continue
            chat = message.get("chat", {})
            sender = message.get("from", {})
            messages.append(
                {
                    "update_id": update.get("update_id"),
                    "message_id": message.get("message_id"),
                    "text": message.get("text", ""),
                    "date": message.get("date"),
                    "chat": {
                        "id": chat.get("id"),
                        "type": chat.get("type"),
                        "title": chat.get("title"),
                        "username": chat.get("username"),
                    },
                    "from": {
                        "id": sender.get("id"),
                        "first_name": sender.get("first_name"),
                        "last_name": sender.get("last_name"),
                        "username": sender.get("username"),
                    },
                }
            )
        return messages

    async def get_unread_count(self) -> int:
        updates = await self.get_updates(limit=100)
        return len(updates)

    async def send_message(self, chat_id: str | int, text: str, parse_mode: str = "Markdown") -> Dict[str, Any]:
        url = f"{self.api_base}/sendMessage"
        payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
        print(f"[Telegram] POST 호출: {url} payload={payload}", flush=True)
        try:
            response = await self.session.post(url, json=payload)
            response.raise_for_status()
        except HTTPStatusError as exc:
            status = exc.response.status_code
            text = exc.response.text
            print(f"[Telegram] 메시지 전송 실패 HTTP {status}: {text}", flush=True)
            raise RuntimeError(f"Telegram 메시지 전송 실패 (HTTP {status}): {text}") from exc
        data = response.json()
        if not data.get("ok", False):
            raise RuntimeError(f"Telegram 메시지 전송 실패: {data}")
        return data

    async def close(self) -> None:
        await self.session.aclose()


try:
    telegram_service: Optional[TelegramService] = TelegramService()
except RuntimeError:
    telegram_service = None
