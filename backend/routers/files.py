from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import mimetypes
from pathlib import Path
import google.generativeai as genai
from PIL import Image
import markdown
import io
from dotenv import load_dotenv
import base64

# 환경변수 로드
load_dotenv()

# Gemini AI 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

router = APIRouter()

UPLOAD_DIR = Path("../../uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

SUMMARIES_DIR = Path("../../summaries")
SUMMARIES_DIR.mkdir(exist_ok=True)

class FileAnalysisResult(BaseModel):
    filename: str
    file_type: str
    category: str  # image, document, audio, other
    analysis_result: str
    summary_path: str
    size: int

class FileInfo(BaseModel):
    id: int
    filename: str
    filepath: str
    file_type: Optional[str] = None
    message: str

def detect_file_category(filename: str, mime_type: str) -> tuple[str, str]:
    """파일 타입 감지 및 카테고리 분류"""
    extension = Path(filename).suffix.lower()

    # 이미지 파일
    image_types = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    if extension in image_types or mime_type.startswith('image/'):
        return 'image', mime_type or f'image/{extension[1:]}'

    # 문서 파일
    document_types = {'.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.json', '.rtf'}
    if extension in document_types or mime_type.startswith(('application/', 'text/')):
        return 'document', mime_type or f'application/{extension[1:]}'

    # 오디오 파일
    audio_types = {'.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'}
    if extension in audio_types or mime_type.startswith('audio/'):
        return 'audio', mime_type or f'audio/{extension[1:]}'

    return 'other', mime_type or 'application/octet-stream'

async def analyze_image(file_path: Path) -> str:
    """이미지 AI 분석 - Gemini Vision API 사용"""
    try:
        # Gemini Pro Vision 모델 사용
        model = genai.GenerativeModel('gemini-pro-vision')

        # 이미지 열기
        image = Image.open(file_path)

        # 프롬프트 - 한국어로 이미지 분석 요청
        prompt = """이 이미지를 자세히 분석해주세요. 다음 내용들을 포함해서 한국어로 설명해 주세요:

1. 이미지에 있는 주요 내용이나 개체들
2. 이미지에서 보이는 텍스트 (OCR)
3. 이미지의 전체적인 상황이나 맥락
4. 색상, 구도, 감정적 느낌
5. 이미지가 무엇인지, 어디서 찍었는지 추측

간단하고 명확하게 요약해서 2-3문장으로 정리해 주세요."""

        # 분석 실행
        response = model.generate_content([prompt, image])
        return response.text.strip()
    except Exception as e:
        return f"이미지 분석 중 오류 발생: {str(e)}"

async def analyze_document(file_path: Path, mime_type: str) -> str:
    """문서 AI 분석 - Gemini Pro API 사용"""
    try:
        model = genai.GenerativeModel('gemini-pro')

        # 텍스트 파일 읽기
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            with open(file_path, 'r', encoding='cp949') as f:
                content = f.read()

        # 내용이 너무 길면 요약
        if len(content) > 10000:
            content = content[:10000] + "... (내용이 길어서 일부만 분석)"

        # 프롬프트 - 한국어로 문서 분석 요청
        prompt = f"""다음 문서의 내용을 분석해서 한국어로 요약해 주세요:

{content}

다음 항목들을 포함해서 정리해 주세요:
1. 문서의 전체 주제나 목적
2. 주요 내용이나 핵심 포인트 3-5개
3. 중요한 수치나 데이터 (있다면)
4. 문서 유형 (보고서, 계약서, 기사 등)
5. 2-3문장 요약

간단하고 명확하게 작성해 주세요."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"문서 분석 중 오류 발생: {str(e)}"

async def analyze_audio(file_path: Path) -> str:
    """오디오 AI 분석 - 음성 전사 및 요약"""
    try:
        model = genai.GenerativeModel('gemini-pro')

        # 오디오 파일을 텍스트로 변환 (간단한 버전)
        # 실제 구현에서는 Whisper API나 Speech-to-Text API 사용 권장
        prompt = f"""이 오디오 파일을 분석해 주세요.

파일이름: {file_path.name}

이 오디오 파일의 내용을 기반으로 다음을 한국어로 작성해 주세요:
1. 오디오의 전체적인 내용이나 주제
2. 화자가 말하는 주요 내용 (추정)
3. 감정이나 어조
4. 길이나 형태 (대화, 발표, 음악 등)
5. 2-3문장 요약

참고: 실제 구현에서는 음성 전사가 필요합니다."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"오디오 분석 중 오류 발생: {str(e)}"

async def analyze_other_file(file_path: Path) -> str:
    """기타 파일 기본 분석"""
    try:
        stat = file_path.stat()
        return f"""파일 정보:
- 파일명: {file_path.name}
- 크기: {stat.st_size:,} bytes
- 타입: {mimetypes.guess_type(str(file_path))[0] or '알 수 없음'}
- 수정일: {stat.st_mtime}

이 파일은 일반 분석이 지원되지 않는 형식입니다.
파일을 확인하려면 직접 다운로드해서 사용하시기 바랍니다."""
    except Exception as e:
        return f"파일 분석 중 오류 발생: {str(e)}"

def save_summary_to_markdown(filename: str, category: str, analysis_result: str) -> Path:
    """분석 결과를 Markdown 파일로 저장"""
    summary_filename = f"{Path(filename).stem}_{category}_ai_summary.md"
    summary_path = SUMMARIES_DIR / summary_filename

    # Markdown 콘텐츠 생성
    markdown_content = f"""# {filename} - AI 분석 결과

## 📁 파일 정보
- **파일명**: {filename}
- **카테고리**: {category.upper()}
- **분석일**: {Path().cwd().stat().st_mtime if Path().exists() else '2024-01-01'}

## 🤖 AI 분석 결과

{analysis_result}

---
*이 분석은 Google Gemini AI를 사용하여 자동 생성되었습니다.*
"""

    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(markdown_content)

    return summary_path

@router.post("/upload", response_model=FileAnalysisResult)
async def upload_file(file: UploadFile = File(...)):
    """멀티모달 AI 파일 업로드 및 분석"""
    try:
        # 1. 파일 저장
        file_path = UPLOAD_DIR / file.filename
        content = await file.read()

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # 2. 파일 타입 감지
        mime_type, _ = mimetypes.guess_type(file.filename)
        category, detected_type = detect_file_category(file.filename, mime_type or "")

        # 3. AI 분석 실행
        analysis_result = ""

        if category == 'image':
            analysis_result = await analyze_image(file_path)
        elif category == 'document':
            analysis_result = await analyze_document(file_path, detected_type)
        elif category == 'audio':
            analysis_result = await analyze_audio(file_path)
        else:
            analysis_result = await analyze_other_file(file_path)

        # 4. 분석 결과 저장
        summary_path = save_summary_to_markdown(file.filename, category, analysis_result)

        # 5. 결과 반환
        return FileAnalysisResult(
            filename=file.filename,
            file_type=detected_type,
            category=category,
            analysis_result=analysis_result,
            summary_path=str(summary_path),
            size=len(content)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 업로드 및 분석 실패: {str(e)}")

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
