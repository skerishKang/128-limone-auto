import os
from typing import List, Dict, Optional
from datetime import datetime

class DriveService:
    """
    Google Drive API 서비스
    - 파일 목록 조회
    - 파일 업로드/다운로드
    - 드라이브 관리
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GOOGLE_DRIVE_API_KEY", "demo-key")
        self.api_base = "https://www.googleapis.com/drive/v3"
    
    async def get_files(self, max_results: int = 10) -> List[Dict]:
        """
        Google Drive 파일 목록 조회 (더미 구현)
        """
        # TODO: Google Drive API 연동
        files = []
        for i in range(max_results):
            files.append({
                "id": f"file_{i}_{datetime.now().timestamp()}",
                "name": f"📁 샘플 파일 #{i + 1}.pdf",
                "mimeType": "application/pdf",
                "size": f"{1024 * (i + 1)}",  # bytes
                "createdTime": (datetime.now() - timedelta(days=i)).isoformat(),
                "modifiedTime": (datetime.now() - timedelta(hours=i*2)).isoformat(),
                "owners": [{
                    "displayName": "Limone User",
                    "emailAddress": "user@limone.dev"
                }],
                "webViewLink": "#"
            })
        
        return files
    
    async def upload_file(self, file_path: str, file_name: str) -> Dict:
        """
        파일 업로드
        """
        # TODO: Google Drive API 연동
        
        return {
            "success": True,
            "file_id": f"uploaded_{datetime.now().timestamp()}",
            "name": file_name,
            "size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            "status": "uploaded",
            "note": "실제 Drive API 연동 필요"
        }
    
    async def get_storage_info(self) -> Dict:
        """저장소 정보"""
        # TODO: Google Drive API 연동
        return {
            "used": "2.5 GB",
            "total": "15 GB",
            "used_percent": 16.7
        }

# 전역 인스턴스
drive_service = DriveService()
