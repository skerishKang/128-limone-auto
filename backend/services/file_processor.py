import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import UploadFile
import json
import hashlib
from datetime import datetime

from services.gemini_router import gemini_service
from database.db import save_file_info, update_file_processed

class FileProcessor:
    """
    파일 처리 서비스
    - 파일 업로드
    - AI 분석
    - 결과 저장
    """
    
    def __init__(self, upload_dir: str = None):
        self.upload_dir = Path(upload_dir or "../uploads")
        self.upload_dir.mkdir(exist_ok=True)
        self.allowed_extensions = {
            '.pdf', '.doc', '.docx', '.txt', '.md',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
            '.mp4', '.avi', '.mov', '.wmv', '.flv',
            '.mp3', '.wav', '.flac', '.aac',
            '.csv', '.xlsx', '.json', '.xml'
        }
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, file: UploadFile) -> Dict[str, Any]:
        """파일 검증"""
        errors = []
        
        # 파일명 검증
        if not file.filename:
            errors.append("파일명이 없습니다")
        
        # 확장자 검증
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.allowed_extensions:
            errors.append(f"지원하지 않는 파일 형식: {file_ext}")
        
        # 크기 검증 (이것은 대략적인 체크)
        # 실제 크기는 파일을 읽은 후에야 정확히 알 수 있음
        
        if errors:
            return {
                "valid": False,
                "errors": errors
            }
        
        return {
            "valid": True,
            "file_ext": file_ext,
            "mime_type": file.content_type
        }
    
    async def save_upload(self, file: UploadFile) -> Dict[str, Any]:
        """파일 업로드 및 저장"""
        # 파일 검증
        validation = self.validate_file(file)
        if not validation["valid"]:
            raise ValueError(", ".join(validation["errors"]))
        
        # 파일명 생성 (중복 방지)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_name = file.filename
        safe_name = self._sanitize_filename(original_name)
        filename = f"{timestamp}_{safe_name}"
        file_path = self.upload_dir / filename
        
        # 파일 저장
        try:
            content = await file.read()
            file_size = len(content)
            
            # 크기 체크
            if file_size > self.max_file_size:
                raise ValueError(f"파일 크기가 너무 큽니다 (최대 {self.max_file_size // (1024*1024)}MB)")
            
            with open(file_path, "wb") as f:
                f.write(content)
            
            return {
                "success": True,
                "filename": filename,
                "original_name": original_name,
                "file_path": str(file_path),
                "file_size": file_size,
                "file_type": validation["file_ext"],
                "mime_type": validation["mime_type"],
                "content_hash": self.get_file_hash(str(file_path)),
                "created_at": timestamp,
            }
        except Exception as e:
            raise ValueError(f"파일 저장 실패: {str(e)}")
    
    async def process_file(self, file_path: str, message_id: Optional[int] = None) -> Dict[str, Any]:
        """파일 AI 분석"""
        file_path_obj = Path(file_path)
        
        if not file_path_obj.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        
        # 파일 정보
        file_type = file_path_obj.suffix.lower()
        file_size = file_path_obj.stat().st_size
        
        # Gemini AI 분석
        analysis_result = await gemini_service.analyze_file(file_path, file_type)
        
        # DB에 저장
        if message_id:
            try:
                save_file_info(
                    message_id=message_id,
                    filename=file_path_obj.name,
                    filepath=file_path,
                    file_type=file_type,
                    file_size=file_size
                )
            except Exception as e:
                print(f"DB 저장 실패: {e}")
        
        return {
            "success": True,
            "file_info": {
                "filename": file_path_obj.name,
                "file_path": file_path,
                "file_type": file_type,
                "file_size": file_size,
            },
            "analysis": analysis_result.get("analysis", {}),
            "raw_result": analysis_result,
            "message": f"파일 '{file_path_obj.name}' 분석 완료"
        }
    
    def list_files(self) -> List[Dict[str, Any]]:
        """업로드된 파일 목록"""
        files = []
        for file_path in self.upload_dir.glob("*"):
            if file_path.is_file():
                stat = file_path.stat()
                files.append({
                    "filename": file_path.name,
                    "size": stat.st_size,
                    "created_at": stat.st_ctime,
                    "modified_at": stat.st_mtime,
                    "path": str(file_path)
                })
        return files
    
    def delete_file(self, filename: str) -> bool:
        """파일 삭제"""
        file_path = self.upload_dir / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    def _sanitize_filename(self, filename: str) -> str:
        """파일명 정리 (보안)"""
        # 특수문자 제거
        safe_name = "".join(c for c in filename if c.isalnum() or c in ('.', '-', '_'))
        # 길이 제한
        if len(safe_name) > 100:
            name, ext = os.path.splitext(safe_name)
            safe_name = name[:90] + ext
        return safe_name
    
    def get_file_hash(self, file_path: str) -> str:
        """파일 해시 생성 (중복 체크용)"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

# 전역 인스턴스
file_processor = FileProcessor()
