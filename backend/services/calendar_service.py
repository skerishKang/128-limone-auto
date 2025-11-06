import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class CalendarService:
    """
    Google Calendar API 서비스
    - 이벤트 조회
    - 이벤트 생성
    - 일정 관리
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GOOGLE_CALENDAR_API_KEY", "demo-key")
        self.api_base = "https://www.googleapis.com/calendar/v3"
    
    async def get_events(self, max_results: int = 10) -> List[Dict]:
        """
        캘린더 이벤트 조회 (더미 구현)
        """
        # TODO: Google Calendar API 연동
        events = []
        for i in range(max_results):
            start_time = datetime.now() + timedelta(hours=i+1)
            end_time = start_time + timedelta(hours=1)
            
            events.append({
                "id": f"event_{i}_{datetime.now().timestamp()}",
                "summary": f"📅 샘플 이벤트 #{i + 1}",
                "description": "캘린더 연동 샘플 데이터 (실제 API 연동 필요)",
                "start": {
                    "dateTime": start_time.isoformat(),
                    "timeZone": "Asia/Seoul"
                },
                "end": {
                    "dateTime": end_time.isoformat(),
                    "timeZone": "Asia/Seoul"
                },
                "location": "온라인",
                "attendees": [f"user{i}@example.com"]
            })
        
        return events
    
    async def create_event(self, summary: str, start_time: datetime, end_time: datetime) -> Dict:
        """
        캘린더 이벤트 생성
        """
        # TODO: Google Calendar API 연동
        
        return {
            "success": True,
            "event_id": f"created_{datetime.now().timestamp()}",
            "summary": summary,
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "status": "confirmed",
            "note": "실제 Calendar API 연동 필요"
        }
    
    async def get_today_events(self) -> int:
        """오늘 일정 수"""
        # TODO: Google Calendar API 연동
        return 3  # 더미 데이터

# 전역 인스턴스
calendar_service = CalendarService()
