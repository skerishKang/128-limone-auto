from typing import Optional, Literal
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.file_processor import file_processor
from services.gemini_router import gemini_service


router = APIRouter()


class GeminiSummarizeRequest(BaseModel):
    filename: str = Field(..., description="업로드된 파일의 저장명")
    summary_style: Optional[Literal["bullet", "executive", "table"]] = Field(
        default=None, description="요약 스타일 선택 (없으면 일반 요약)"
    )
    include_questions: bool = Field(default=True, description="예상 질문을 포함할지 여부")
    custom_prompt: Optional[str] = Field(default=None, description="추가 프롬프트 지시")
    max_chars: int = Field(default=8000, ge=1000, le=20000, description="분석 시 읽을 문자 수 한도")
    tag_count: int = Field(default=5, ge=0, le=10, description="생성할 태그 최대 개수")


class GeminiQuestionRequest(BaseModel):
    filename: str = Field(..., description="업로드된 파일의 저장명")
    question: str = Field(..., description="문서 기반 질문 내용")
    custom_prompt: Optional[str] = Field(default=None, description="추가 지시 문구")
    max_chars: int = Field(default=8000, ge=1000, le=20000, description="분석 시 읽을 문자 수 한도")


class GeminiTagsRequest(BaseModel):
    filename: str = Field(..., description="업로드된 파일의 저장명")
    tag_count: int = Field(default=5, ge=1, le=20, description="생성할 태그 수")
    custom_prompt: Optional[str] = Field(default=None, description="태그 생성 시 추가 지시")
    max_chars: int = Field(default=6000, ge=1000, le=20000, description="분석 시 읽을 문자 수 한도")


class GeminiCompareRequest(BaseModel):
    left_filename: str = Field(..., description="비교 대상 문서 A의 저장명")
    right_filename: str = Field(..., description="비교 대상 문서 B의 저장명")
    focus: Optional[str] = Field(default=None, description="비교 시 집중할 주제 또는 항목")
    max_chars: int = Field(default=6000, ge=1000, le=20000, description="각 문서에서 읽을 문자 수 한도")


def _resolve_file_path(filename: str) -> Path:
    """업로드 디렉터리 기준으로 파일 경로를 확인"""
    path = file_processor.upload_dir / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="지정한 파일을 찾을 수 없습니다.")
    return path


@router.get("/status", summary="Gemini 설정 상태 조회")
async def get_gemini_status():
    """Gemini 서비스 구성 여부 확인"""
    return gemini_service.get_status()


@router.post("/document/summarize", summary="문서 요약 및 핵심 추출")
async def summarize_document(payload: GeminiSummarizeRequest):
    path = _resolve_file_path(payload.filename)

    try:
        result = await gemini_service.summarize_document_file(
            path,
            summary_style=payload.summary_style,
            custom_prompt=payload.custom_prompt,
            include_questions=payload.include_questions,
            max_chars=payload.max_chars,
            tag_count=payload.tag_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini 요약 처리 실패: {exc}") from exc

    return {
        "filename": payload.filename,
        "result": result,
    }


@router.post("/document/question", summary="문서 기반 질문 응답")
async def answer_document_question(payload: GeminiQuestionRequest):
    path = _resolve_file_path(payload.filename)

    try:
        result = await gemini_service.answer_document_question(
            path,
            payload.question,
            custom_prompt=payload.custom_prompt,
            max_chars=payload.max_chars,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini 질의응답 처리 실패: {exc}") from exc

    return {
        "filename": payload.filename,
        "question": payload.question,
        "result": result,
    }


@router.post("/document/tags", summary="문서 태그 자동 생성")
async def generate_document_tags(payload: GeminiTagsRequest):
    path = _resolve_file_path(payload.filename)

    try:
        tags = await gemini_service.generate_document_tags(
            path,
            tag_count=payload.tag_count,
            custom_prompt=payload.custom_prompt,
            max_chars=payload.max_chars,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini 태그 생성 실패: {exc}") from exc

    return {
        "filename": payload.filename,
        "tags": tags,
    }


@router.post("/document/compare", summary="두 문서 비교 분석")
async def compare_documents(payload: GeminiCompareRequest):
    left_path = _resolve_file_path(payload.left_filename)
    right_path = _resolve_file_path(payload.right_filename)

    try:
        result = await gemini_service.compare_documents(
            left_path,
            right_path,
            focus=payload.focus,
            max_chars=payload.max_chars,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini 비교 분석 실패: {exc}") from exc

    return {
        "left_filename": payload.left_filename,
        "right_filename": payload.right_filename,
        "result": result,
    }
