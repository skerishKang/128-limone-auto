import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json

class GmailService:
    """
    Gmail API 서비스
    - 이메일 조회
    - 이메일 발송
    - 라벨 관리
    """
    
    def __init__(self, client_id: str = None, client_secret: str = None):
        self.client_id = client_id or os.getenv("GMAIL_CLIENT_ID", "demo-client-id")
        self.client_secret = client_secret or os.getenv("GMAIL_CLIENT_SECRET", "demo-secret")
        self.api_base = "https://gmail.googleapis.com/gmail/v1"
    
    async def get_emails(self, max_results: int = 10) -> List[Dict]:
        """
        최근 이메일 조회 (더미 구현)
        TODO: Gmail API OAuth2 인증 및 연동
        """
        # TODO: 실제 Gmail API 연동
        # - OAuth2 인증 토큰 확인
        # - Gmail API 호출
        # - 응답 파싱
        
        # 더미 이메일 데이터
        emails = []
        for i in range(max_results):
            emails.append({
                "id": f"email_{i}_{datetime.now().timestamp()}",
                "subject": f"📧 샘플 이메일 #{i + 1}",
                "sender": f"user{i}@example.com",
                "snippet": f"이것은 샘플 이메일 내용입니다... (실제 Gmail API 연동 필요)",
                "date": (datetime.now() - timedelta(hours=i)).isoformat(),
                "is_read": i % 3 == 0,
                "labels": ["INBOX", "IMPORTANT"] if i % 2 == 0 else ["INBOX"]
            })
        
        return emails
    
    async def send_email(self, to: str, subject: str, body: str) -> Dict:
        """
        이메일 발송
        """
        # TODO: Gmail API 연동
        # - MIME 메시지 생성
        # - Gmail API send 호출
        # - 결과 반환
        
        return {
            "success": True,
            "message_id": f"sent_{datetime.now().timestamp()}",
            "to": to,
            "subject": subject,
            "status": "sent",
            "note": "실제 Gmail API 연동 필요"
        }
    
    async def get_unread_count(self) -> int:
        """읽지 않은 이메일 수"""
        # TODO: Gmail API 연동
        return 5  # 더미 데이터
    
    def is_configured(self) -> bool:
        """API 설정 확인"""
        return self.client_id != "demo-client-id" and self.client_secret != "demo-secret"

# 전역 인스턴스
gmail_service = GmailService()
