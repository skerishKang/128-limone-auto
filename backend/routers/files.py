from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path("../../uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class FileInfo(BaseModel):
    id: int
    filename: str
    filepath: str
    file_type: Optional[str] = None
    message: str

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """파일 업로드"""
    try:
        # 파일 저장
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # TODO: Gemini AI 연동하여 파일 분석
        # 현재는 더미 응답
        result = f"File '{file.filename}' uploaded successfully. AI analysis coming soon!"
        
        return {
            "filename": file.filename,
            "filepath": str(file_path),
            "size": len(content),
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/list")
async def list_files():
    """업로드된 파일 목록"""
    try:
        files = []
        for file_path in UPLOAD_DIR.glob("*"):
            if file_path.is_file():
                files.append({
                    "filename": file_path.name,
                    "size": file_path.stat().st_size,
                    "created_at": file_path.stat().st_ctime
                })
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.delete("/delete/{filename}")
async def delete_file(filename: str):
    """파일 삭제"""
    try:
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
            return {"message": f"File {filename} deleted"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
