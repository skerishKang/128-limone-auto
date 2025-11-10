import asyncio
from uuid import uuid4
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal, Union
from pathlib import Path
import io
from datetime import datetime

from services.file_processor import file_processor
from services.drive_service import (
    drive_service,
    DriveAuthorizationError,
    DriveAPIError,
)

router = APIRouter()

UPLOAD_DIR = file_processor.upload_dir
SUMMARIES_DIR = Path(__file__).resolve().parents[2] / "summaries"
SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)

PROCESSING_TASKS: Dict[str, Dict[str, Any]] = {}


class FileMetadata(BaseModel):
    stored_name: str
    original_name: str
    mime_type: Optional[str]
    size: int
    category: str
    path: str


class AnalysisPayload(BaseModel):
    summary: Optional[str] = None
    content_type: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None
    raw: Dict[str, Any] = Field(default_factory=dict)


class FileAnalysisResult(BaseModel):
    success: bool
    message: str
    file: FileMetadata
    analysis: AnalysisPayload
    summary_path: Optional[str] = None
    drive_upload: Optional[Dict[str, Any]] = None


class FileProcessingStatusResponse(BaseModel):
    task_id: str
    status: Literal['processing', 'completed', 'failed']
    result: Optional[FileAnalysisResult] = None
    error: Optional[str] = None
    filename: Optional[str] = None


class FileUploadProcessingResponse(BaseModel):
    task_id: str
    status: Literal['processing']
    message: str
    check_endpoint: str
    filename: str
    estimated_time: Optional[str] = "30-60초"


class FileUploadCompletedResponse(BaseModel):
    status: Literal['completed']
    message: str
    filename: str
    result: Optional[FileAnalysisResult] = None


FileUploadResponse = Union[FileUploadProcessingResponse, FileUploadCompletedResponse]


def categorize_file(file_ext: Optional[str], mime_type: Optional[str]) -> str:
    ext = (file_ext or "").lower()
    mime = (mime_type or "").lower()

    image_types = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    document_types = {".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".json", ".rtf"}
    audio_types = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac"}

    if ext in image_types or mime.startswith("image/"):
        return "image"
    if ext in document_types or mime.startswith("application/") or mime.startswith("text/"):
        return "document"
    if ext in audio_types or mime.startswith("audio/"):
        return "audio"
    return "other"


def save_summary_to_markdown(filename: str, category: str, analysis_result: str) -> Path:
    """분석 결과를 Markdown 파일로 저장"""
    summary_filename = f"{Path(filename).stem}_{category}_ai_summary.md"
    summary_path = SUMMARIES_DIR / summary_filename

    markdown_content = f"""# {filename} - AI 분석 결과

## 📁 파일 정보
- **파일명**: {filename}
- **카테고리**: {category.upper()}
- **분석일**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 🤖 AI 분석 결과

{analysis_result}

---
*이 분석은 Google Gemini AI를 사용하여 자동 생성되었습니다.*
"""

    summary_path.write_text(markdown_content, encoding="utf-8")
    return summary_path


async def _run_file_analysis(saved: Dict[str, Any]) -> FileAnalysisResult:
    analysis_result = await file_processor.process_file(saved["file_path"])

    analysis_payload = analysis_result.get("analysis", {})
    raw_payload = analysis_result.get("raw_result", {})

    category = analysis_payload.get("content_type") or categorize_file(
        saved.get("file_type"),
        saved.get("mime_type"),
    )

    summary_text = (analysis_payload or {}).get("summary")
    summary_path = None
    if summary_text:
        summary_path = save_summary_to_markdown(
            saved["original_name"],
            category,
            summary_text,
        )

    drive_upload_info: Optional[Dict[str, Any]] = None
    if category == "other":
        try:
            with open(saved["file_path"], "rb") as f:
                buffer = io.BytesIO(f.read())
                buffer.seek(0)
            uploaded = await drive_service.upload_file(
                stream=buffer,
                filename=saved["original_name"],
                mime_type=saved.get("mime_type"),
            )
            drive_upload_info = {
                "success": True,
                "file_id": uploaded.get("id"),
                "name": uploaded.get("name"),
                "webViewLink": uploaded.get("webViewLink"),
                "webContentLink": uploaded.get("webContentLink"),
            }
        except DriveAuthorizationError as exc:
            drive_upload_info = {
                "success": False,
                "error": str(exc),
                "requires_auth": True,
            }
        except DriveAPIError as exc:
            drive_upload_info = {
                "success": False,
                "error": str(exc),
            }
        except Exception as exc:  # pragma: no cover - 예기치 않은 오류 로깅용
            drive_upload_info = {
                "success": False,
                "error": f"Drive 업로드 실패: {exc}",
            }

    return FileAnalysisResult(
        success=analysis_result.get("success", True),
        message=analysis_result.get("message", "파일 분석이 완료되었습니다."),
        file=FileMetadata(
            stored_name=saved["filename"],
            original_name=saved["original_name"],
            mime_type=saved.get("mime_type"),
            size=saved["file_size"],
            category=category,
            path=saved["file_path"],
        ),
        analysis=AnalysisPayload(
            summary=summary_text,
            content_type=analysis_payload.get("content_type"),
            key_points=analysis_payload.get("key_points", []),
            metadata=analysis_payload.get("metadata"),
            raw=raw_payload,
        ),
        summary_path=str(summary_path) if summary_path else None,
        drive_upload=drive_upload_info,
    )


async def _process_file_task(task_id: str, saved: Dict[str, Any]) -> None:
    try:
        result = await _run_file_analysis(saved)
        PROCESSING_TASKS[task_id]["status"] = "completed"
        result_payload = result.model_dump()
        result_payload.setdefault("status", "success" if result.success else "failed")
        PROCESSING_TASKS[task_id]["result"] = result_payload
        PROCESSING_TASKS[task_id]["completed_at"] = datetime.utcnow().isoformat()
    except Exception as exc:  # pragma: no cover - 예기치 않은 오류 로깅용
        PROCESSING_TASKS[task_id]["status"] = "failed"
        PROCESSING_TASKS[task_id]["error"] = str(exc)
        PROCESSING_TASKS[task_id]["completed_at"] = datetime.utcnow().isoformat()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """멀티모달 AI 파일 업로드 (비동기 분석)"""
    try:
        saved = await file_processor.save_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {exc}") from exc

    category = categorize_file(saved.get("file_type"), saved.get("mime_type"))

    if category == "image":
        immediate_result = FileAnalysisResult(
            success=True,
            message="이미지 업로드가 완료되었습니다.",
            file=FileMetadata(
                stored_name=saved["filename"],
                original_name=saved.get("original_name", saved["filename"]),
                mime_type=saved.get("mime_type"),
                size=saved.get("file_size", 0),
                category=category,
                path=saved["file_path"],
            ),
            analysis=AnalysisPayload(
                summary=None,
                content_type="image",
                key_points=[],
                metadata=None,
                raw={
                    "note": "이미지 파일은 업로드만 지원되며 AI 분석은 추후 제공됩니다.",
                },
            ),
            summary_path=None,
            drive_upload=None,
        )

        return FileUploadCompletedResponse(
            status="completed",
            message="이미지 업로드가 완료되었습니다.",
            filename=saved.get("original_name", saved.get("filename")),
            result=immediate_result,
        )

    task_id = uuid4().hex
    PROCESSING_TASKS[task_id] = {
        "status": "processing",
        "saved": saved,
        "filename": saved.get("original_name"),
        "started_at": datetime.utcnow().isoformat(),
    }

    asyncio.create_task(_process_file_task(task_id, saved))

    return FileUploadProcessingResponse(
        task_id=task_id,
        status="processing",
        message="파일 업로드 완료. AI 분석이 백그라운드에서 진행 중입니다.",
        check_endpoint=f"/api/files/status/{task_id}",
        filename=saved.get("original_name", saved.get("filename")),
    )


@router.get("/status/{task_id}", response_model=FileProcessingStatusResponse)
async def get_file_status(task_id: str):
    task = PROCESSING_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="해당 작업을 찾을 수 없습니다.")

    response: Dict[str, Any] = {
        "task_id": task_id,
        "status": task.get("status", "processing"),
        "filename": task.get("filename"),
    }

    if task["status"] == "completed" and task.get("result"):
        response["result"] = task["result"]
    if task["status"] == "failed":
        response["error"] = task.get("error", "파일 처리 중 오류가 발생했습니다.")

    return response

@router.get("/list")
async def list_files():
    """업로드된 파일 목록"""
    try:
        return file_processor.list_files()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.get("/summaries")
async def list_summaries():
    """AI 분석 결과 목록"""
    try:
        summaries = []
        for summary_path in SUMMARIES_DIR.glob("*.md"):
            summaries.append({
                "filename": summary_path.name,
                "path": str(summary_path),
                "size": summary_path.stat().st_size,
                "created_at": summary_path.stat().st_ctime
            })
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list summaries: {str(e)}")

@router.get("/summary/{filename}")
async def get_summary(filename: str):
    """특정 파일의 분석 결과 조회"""
    try:
        # 파일명에서 summary 파일 찾기
        stem = Path(filename).stem
        summary_files = list(SUMMARIES_DIR.glob(f"{stem}_*_ai_summary.md"))

        if not summary_files:
            raise HTTPException(status_code=404, detail="Summary not found")

        summary_path = summary_files[0]
        with open(summary_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return {
            "filename": filename,
            "summary_path": str(summary_path),
            "content": content
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")

@router.delete("/delete/{filename}")
async def delete_file(filename: str):
    """파일 및 관련 요약 삭제"""
    try:
        if file_processor.delete_file(filename):
            file_path = UPLOAD_DIR / filename
            if file_path.exists():
                file_path.unlink()

        # 관련 요약 파일도 삭제
        stem = Path(filename).stem
        for summary_path in SUMMARIES_DIR.glob(f"{stem}_*_ai_summary.md"):
            summary_path.unlink()

        return {"message": f"File {filename} and its summary deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
