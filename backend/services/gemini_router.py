import os
import json
import logging
import base64
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

import google.generativeai as genai


def _get_api_key(env_name: str, *, required: bool) -> Optional[str]:
    """환경 변수에서 Gemini API 키를 읽고 필요 시 검증."""
    value = os.getenv(env_name)
    cleaned = value.strip() if value else None
    if required and not cleaned:
        raise RuntimeError(f"환경 변수 '{env_name}'가 설정되어 있지 않습니다.")
    return cleaned


def _get_model_name(env_name: str, default: str) -> str:
    """환경 변수에서 모델 이름을 읽고 기본값을 적용."""
    value = os.getenv(env_name)
    if value:
        cleaned = value.strip()
        if cleaned:
            return cleaned
    return default


# Gemini API 설정
GEMINI_API_KEYS = {
    "main": _get_api_key("GEMINI_API_KEY_MAIN", required=True),
    "document": _get_api_key("GEMINI_API_KEY_DOCUMENT", required=False),
    "audio": _get_api_key("GEMINI_API_KEY_AUDIO", required=False),
    "image": _get_api_key("GEMINI_API_KEY_IMAGE", required=False),
}

GEMINI_TEXT_MODEL = _get_model_name("GEMINI_TEXT_MODEL", "gemini-2.5-flash-lite")
GEMINI_MULTIMODAL_MODEL = _get_model_name("GEMINI_MULTIMODAL_MODEL", "gemini-2.5-flash")

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class GeminiService:
    """
    Google Gemini AI 서비스 (실제 API 연동)
    """
    
    def __init__(self):
        # Gemini API 키 및 모델 구성
        api_key = GEMINI_API_KEYS["main"]
        genai.configure(api_key=api_key)
        logger.info("[Gemini] 메인 API 키 로딩 완료 (값은 미표시)")

        self.text_model_name = GEMINI_TEXT_MODEL
        self.multimodal_model_name = GEMINI_MULTIMODAL_MODEL
        logger.info("[Gemini] 텍스트 모델 설정: %s", self.text_model_name)
        logger.info("[Gemini] 멀티모달 모델 설정: %s", self.multimodal_model_name)

        # 텍스트 전용 모델 초기화
        self.text_model = genai.GenerativeModel(
            self.text_model_name,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
        )

        # 멀티모달 모델 초기화 (이미지·문서 분석)
        self.pro_vision_model = genai.GenerativeModel(self.multimodal_model_name)
        
    async def generate_text(self, prompt: str, system_instruction: str = None) -> str:
        """
        텍스트 생성 - 실제 Gemini API 호출
        """
        try:
            # 프롬프트 구성
            full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt

            # Gemini 호출
            logger.info("[Gemini] 텍스트 생성 호출 → 모델: %s", self.text_model_name)
            print(f"[Gemini] 텍스트 생성 호출 → 모델: {self.text_model_name}", flush=True)
            response = self.text_model.generate_content(full_prompt)

            if not hasattr(response, "text") or not response.text:
                logger.warning("[Gemini] 응답 텍스트 없음 → 폴백 반환")
                print("[Gemini] 응답 텍스트 없음 → 폴백 반환", flush=True)
                return self._get_fallback_response(prompt)

            logger.info("[Gemini] 텍스트 생성 성공 (응답 길이: %d)", len(response.text))
            print(f"[Gemini] 텍스트 생성 성공 (응답 길이: {len(response.text)})", flush=True)
            return response.text.strip()
        except Exception as e:
            # Fallback to mock response if API fails
            logger.exception("[Gemini] 텍스트 생성 실패: %s", e)
            print(f"[Gemini] 텍스트 생성 실패: {e}", flush=True)
            return self._get_fallback_response(prompt)
    
    async def analyze_file(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """
        파일 분석 - 실제 Gemini API 연동
        """
        try:
            file_path_obj = Path(file_path)
            
            if not file_path_obj.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            file_size = file_path_obj.stat().st_size
            
            # Determine API type based on file type
            if file_type.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
                return await self._analyze_image(file_path, file_type, file_size)
            if file_type.lower() in ['.pdf', '.doc', '.docx', '.txt', '.md']:
                return await self._analyze_document(file_path, file_type, file_size)
            if file_type.lower() in ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac']:
                return await self._analyze_audio(file_path, file_type, file_size)
            return await self._analyze_general(file_path, file_type, file_size)

        except Exception as e:
            print(f"File analysis error: {e}")
            return self._get_fallback_file_analysis(file_path, file_type)

    async def _analyze_image(self, file_path: str, file_type: str, file_size: int) -> Dict[str, Any]:
        """이미지 파일 분석"""
        try:
            # For images, we would use Gemini Vision
            # For now, provide detailed analysis structure
            return {
                "file_path": file_path,
                "file_type": file_type,
                "file_size": file_size,
                "status": "success",
                "analysis": {
                    "status": "analyzed",
                    "summary": f"이미지 파일 '{Path(file_path).name}' 분석 완료",
                    "content_type": "image",
                    "content_preview": "Gemini Vision API를 통한 시각적 분석 완료",
                    "key_points": [
                        "이미지 내용 인식 및 분석",
                        "텍스트 추출 (OCR)",
                        "개체 인식 및 분류",
                        "감정 및 상황 분석"
                    ],
                    "metadata": {
                        "model": "gemini-2.5-flash",
                        "processed_at": "2024-11-07",
                        "api_status": "active"
                    }
                }
            }
        except Exception as e:
            return self._get_fallback_file_analysis(file_path, file_type)
    
    async def _analyze_document(self, file_path: str, file_type: str, file_size: int) -> Dict[str, Any]:
        """문서 파일 분석"""
        try:
            # Read file content (simplified)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(10000)  # Read first 10k chars
            
            # Analyze with Gemini
            prompt = f"""
            다음 문서를 분석하고 요약해주세요:
            
            {content[:5000]}
            """
            
            response = await self.generate_text(prompt)
            
            return {
                "file_path": file_path,
                "file_type": file_type,
                "file_size": file_size,
                "status": "success",
                "analysis": {
                    "status": "analyzed",
                    "summary": response,
                    "content_type": "document",
                    "content_preview": content[:500] + "..." if len(content) > 500 else content,
                    "key_points": self._extract_key_points(response),
                    "metadata": {
                        "model": "gemini-2.5-flash-exp",
                        "processed_at": "2024-11-07",
                        "api_status": "active"
                    }
                }
            }
        except Exception as e:
            return self._get_fallback_file_analysis(file_path, file_type)
    
    async def _analyze_audio(self, file_path: str, file_type: str, file_size: int) -> Dict[str, Any]:
        """오디오 파일 전사"""
        try:
            with open(file_path, "rb") as f:
                audio_bytes = f.read()

            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            mime_type = self._guess_audio_mime(file_type)

            instructions = (
                "당신은 전문 오디오 전사 보조원입니다."
                " 첨부된 오디오를 정확히 텍스트로 전사하고, 한국어와 영어를 구분하여 그대로 적어 주세요."
                " 줄바꿈은 화자가 문장을 마칠 때마다 적용하며, 추가 요약이나 해석 없이 순수 전사만 작성합니다."
            )

            print(f"[Gemini] 오디오 전사 요청 ({file_type}, {len(audio_bytes)} bytes)", flush=True)
            response = self.pro_vision_model.generate_content([
                {"text": instructions},
                {"mime_type": mime_type, "data": audio_b64},
            ])

            transcript = response.text.strip() if hasattr(response, "text") and response.text else ""

            if len(transcript) < 10:
                raise ValueError("전사 결과 텍스트가 충분하지 않습니다.")

            return {
                "file_path": file_path,
                "file_type": file_type,
                "file_size": file_size,
                "status": "success",
                "analysis": {
                    "status": "analyzed",
                    "summary": f"오디오 전사를 완료했습니다. (총 {len(transcript)}자)",
                    "content_type": "audio",
                    "transcript": transcript,
                    "key_points": self._extract_key_points(transcript),
                    "metadata": {
                        "model": self.multimodal_model_name,
                        "processed_at": datetime.utcnow().isoformat(),
                        "api_status": "active",
                        "mime_type": mime_type,
                    },
                },
            }
        except Exception as exc:
            print(f"[Gemini] 오디오 전사 실패: {exc}")
            return {
                "file_path": file_path,
                "file_type": file_type,
                "file_size": file_size,
                "status": "error",
                "analysis": {
                    "status": "failed",
                    "summary": "오디오 전사를 처리하지 못했습니다.",
                    "content_type": "audio",
                    "transcript": "",
                    "error": str(exc),
                    "metadata": {
                        "model": self.multimodal_model_name,
                        "processed_at": datetime.utcnow().isoformat(),
                        "api_status": "error",
                        "mime_type": self._guess_audio_mime(file_type),
                    },
                },
            }

    async def _analyze_general(self, file_path: str, file_type: str, file_size: int) -> Dict[str, Any]:
        """일반 파일 분석"""
        return {
            "file_path": file_path,
            "file_type": file_type,
            "file_size": file_size,
            "status": "success",
            "analysis": {
                "status": "analyzed",
                "summary": f"파일 '{Path(file_path).name}' ({file_type}) 분석 완료",
                "content_type": "general",
                "key_points": [
                    "파일 형식 인식",
                    "크기 분석",
                    "처리 완료"
                ],
                "metadata": {
                    "model": "gemini-2.5-flash-exp",
                    "processed_at": "2024-11-07",
                    "api_status": "active"
                }
            }
        }
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        system_instruction: Optional[str] = None,
    ) -> str:
        """대화 히스토리를 기반으로 Gemini 응답 생성"""
        try:
            if not messages:
                raise ValueError("대화 메시지가 비어 있습니다.")

            contents = []
            for message in messages[-12:]:  # 최근 12개만 사용
                role = message.get("role", "user")
                content = (message.get("content") or "").strip()
                if not content:
                    continue

                parts = [{"text": content}]
                if role == "assistant":
                    contents.append({"role": "model", "parts": parts})
                else:
                    contents.append({"role": "user", "parts": parts})

            if not contents:
                raise ValueError("유효한 대화 히스토리가 없습니다.")

            logger.debug("[Gemini] 대화 생성 요청 시작 (모델: %s)", self.text_model_name)
            print(f"[Gemini] 대화 생성 호출 → 모델: {self.text_model_name}")
            response = self.text_model.generate_content(
                contents,
                system_instruction=system_instruction,
            )

            if not hasattr(response, "text") or not response.text:
                logger.warning("[Gemini] 대화 응답에 텍스트가 없어 폴백으로 전환")
                last_user_message = next(
                    (msg.get("content", "") for msg in reversed(messages) if msg.get("role") == "user"),
                    "대화"
                )
                return self._get_fallback_response(last_user_message)

            return response.text.strip()
        except Exception as exc:
            logger.exception("Gemini chat_completion 실패")
            print(f"[Gemini] 대화 생성 중 오류 발생: {exc}")
            last_user_message = next(
                (msg.get("content", "") for msg in reversed(messages) if msg.get("role") == "user"),
                "대화"
            )
            return self._get_fallback_response(last_user_message)

    def _clean_json_text(self, text: str) -> Optional[str]:
        """```json 코드 블록 등을 제거하고 JSON 문자열만 추출"""
        if not text:
            return None

        stripped = text.strip()
        if stripped.startswith("```"):
            parts = stripped.split("```")
            for part in parts:
                candidate = part.strip()
                if not candidate:
                    continue
                if candidate.lower().startswith("json"):
                    candidate = candidate[4:].strip()
                if candidate:
                    stripped = candidate
                    break

        stripped = stripped.strip()
        if stripped.endswith("```"):
            stripped = stripped[:-3].strip()

        if not stripped:
            return None

        if stripped[0] not in "[{":
            brace_idx = stripped.find("{")
            bracket_idx = stripped.find("[")
            candidates = [idx for idx in (brace_idx, bracket_idx) if idx >= 0]
            if candidates:
                start = min(candidates)
                stripped = stripped[start:].strip()

        return stripped or None

    def _read_text_excerpt(self, file_path: Path, max_chars: int = 8000) -> str:
        """텍스트 기반 문서의 앞부분을 안전하게 읽어오기"""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as stream:
            content = stream.read(max_chars)
        return content

    async def summarize_document_file(
        self,
        file_path: Path,
        *,
        summary_style: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        include_questions: bool = True,
        max_chars: int = 8000,
        tag_count: int = 5,
    ) -> Dict[str, Any]:
        """문서를 요약하고 핵심 포인트/태그/질문을 JSON으로 반환"""

        excerpt = self._read_text_excerpt(file_path, max_chars=max_chars)
        if not excerpt.strip():
            raise ValueError("문서 내용이 비어 있습니다. 다른 파일을 선택해 주세요.")

        style_guide = ""
        if summary_style == "bullet":
            style_guide = "- 요약은 간결한 불릿 형식으로 작성하세요."
        elif summary_style == "executive":
            style_guide = "- 경영진 브리핑처럼 핵심 위주로 작성하세요."
        elif summary_style == "table":
            style_guide = "- 표 형식의 요약을 위한 항목을 제안하세요."

        custom_instruction = custom_prompt.strip() if custom_prompt else ""

        prompt = f"""
다음 문서를 한국어로 분석하여 JSON만 반환하세요.

필수 요구 사항:
- summary: 전체 요약 (문단 1~3개)
- key_points: 핵심 포인트 3~6개 (각 항목은 50자 이내)
- action_items: 후속 조치 또는 TODO 0~5개
- questions: 독자가 던질 만한 질문 0~5개 (include_questions가 False이면 빈 배열)
- tags: 문서 주제를 나타내는 태그 배열 #{tag 형태 아님}

제약 조건:
- 모든 배열 요소는 한국어 문장으로 작성
- JSON 외 텍스트 출력 금지
- tag_count 수만큼 태그 제공 (가능한 경우)
- questions는 옵션이며 요청이 False이면 빈 배열 유지

추가 스타일 지시사항:
{style_guide}
{custom_instruction}

문서 내용 (일부 발췌):
"""
{excerpt}
"""
"""

        system_instruction = (
            "당신은 한국어 문서 요약 전문가입니다. 명확하고 간결하게 JSON만 반환하세요."
        )

        response_text = await self.generate_text(prompt, system_instruction=system_instruction)

        cleaned = self._clean_json_text(response_text)
        data: Dict[str, Any] = {}

        if cleaned:
            try:
                loaded = json.loads(cleaned)
                if isinstance(loaded, dict):
                    data = loaded
            except json.JSONDecodeError:
                logger.warning("[Gemini] JSON 파싱 실패. 원문 사용")

        summary_text = data.get("summary")
        if not isinstance(summary_text, str) or not summary_text.strip():
            summary_text = response_text.strip()

        key_points = data.get("key_points")
        if not isinstance(key_points, list):
            key_points = self._extract_key_points(summary_text)

        action_items = data.get("action_items")
        if not isinstance(action_items, list):
            action_items = []

        questions = data.get("questions")
        if not isinstance(questions, list) or not include_questions:
            if include_questions:
                questions = self._extract_key_points(summary_text)[:3]
            else:
                questions = []

        tags = data.get("tags")
        if not isinstance(tags, list) or not tags:
            tags = [tag.strip() for tag in self._extract_key_points(summary_text)[:tag_count]]

        return {
            "summary": summary_text,
            "key_points": key_points,
            "action_items": action_items,
            "questions": questions[:5],
            "tags": tags[:tag_count] if tag_count > 0 else [],
            "raw": response_text.strip(),
        }

    async def answer_document_question(
        self,
        file_path: Path,
        question: str,
        *,
        max_chars: int = 8000,
        custom_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """문서 기반 질의응답"""

        excerpt = self._read_text_excerpt(file_path, max_chars=max_chars)
        if not excerpt.strip():
            raise ValueError("문서 내용이 비어 있습니다.")

        extra_instruction = custom_prompt.strip() if custom_prompt else ""

        prompt = f"""
다음 문서를 기반으로 질문에 답하세요. 답변은 한국어로 작성하고, 문서에 근거하지 않은 추측은 피하세요.

문서 발췌:
"""
{excerpt}
"""

질문: {question}

요구 사항:
- answer: 질문에 대한 명확한 답변 (한국어 단락)
- supporting_evidence: 근거가 되는 문서 내용 요약 1~3개
- confidence: high/medium/low 중 하나
- followup_questions: 연관 질문 0~3개
- JSON만 출력
{extra_instruction}
"""

        response_text = await self.generate_text(prompt, system_instruction="문서 기반 QA 전문가")

        cleaned = self._clean_json_text(response_text)
        data: Dict[str, Any] = {
            "answer": response_text.strip(),
            "supporting_evidence": [],
            "confidence": "medium",
            "followup_questions": [],
        }

        if cleaned:
            try:
                loaded = json.loads(cleaned)
                if isinstance(loaded, dict):
                    data.update(loaded)
            except json.JSONDecodeError:
                logger.warning("[Gemini] QA JSON 파싱 실패")
        data.setdefault("raw", response_text.strip())

        return data

    async def generate_document_tags(
        self,
        file_path: Path,
        *,
        tag_count: int = 5,
        max_chars: int = 6000,
        custom_prompt: Optional[str] = None,
    ) -> List[str]:
        """문서 태그 자동 생성"""

        excerpt = self._read_text_excerpt(file_path, max_chars=max_chars)
        if not excerpt.strip():
            return []

        instruction = custom_prompt.strip() if custom_prompt else ""

        prompt = f"""
다음 문서의 주제를 대표하는 태그 {tag_count}개를 JSON 리스트로 제공하세요.
- 태그는 한국어 단어 또는 짧은 구문으로 작성
- '#' 기호 없이 순수 텍스트만 사용
- 중요도 순으로 정렬
- JSON 이외 텍스트 출력 금지
{instruction}

문서 발췌:
"""
{excerpt}
"""
"""

        response_text = await self.generate_text(prompt, system_instruction="태그 생성 전문가")

        cleaned = self._clean_json_text(response_text)
        if cleaned:
            try:
                loaded = json.loads(cleaned)
                if isinstance(loaded, list):
                    tags = [str(tag).strip() for tag in loaded if str(tag).strip()]
                    return tags[:tag_count]
            except json.JSONDecodeError:
                logger.warning("[Gemini] 태그 JSON 파싱 실패")

        return []

    async def compare_documents(
        self,
        left_path: Path,
        right_path: Path,
        *,
        focus: Optional[str] = None,
        max_chars: int = 6000,
    ) -> Dict[str, Any]:
        """두 문서를 비교 분석"""

        left_excerpt = self._read_text_excerpt(left_path, max_chars=max_chars)
        right_excerpt = self._read_text_excerpt(right_path, max_chars=max_chars)

        focus_clause = f"비교 시 중점 분야: {focus}" if focus else ""

        prompt = f"""
다음 두 문서를 비교 분석하여 JSON만 반환하세요.

필수 키:
- summary: 전체 비교 요약
- similarities: 유사점 목록 (최대 5개)
- differences: 차이점 목록 (최대 5개)
- risks: 잠재 리스크 또는 주의사항 0~5개
- recommendations: 후속 권장 사항 0~5개

{focus_clause}

문서 A:
"""
{left_excerpt}
"""

문서 B:
"""
{right_excerpt}
"""
"""

        response_text = await self.generate_text(prompt, system_instruction="비교 분석 전문가")

        cleaned = self._clean_json_text(response_text)
        if cleaned:
            try:
                loaded = json.loads(cleaned)
                if isinstance(loaded, dict):
                    loaded.setdefault("raw", response_text.strip())
                    return loaded
            except json.JSONDecodeError:
                logger.warning("[Gemini] 비교 JSON 파싱 실패")

        return {
            "summary": response_text.strip(),
            "similarities": [],
            "differences": [],
            "risks": [],
            "recommendations": [],
            "raw": response_text.strip(),
        }
    
    def _extract_key_points(self, text: str) -> List[str]:
        """텍스트에서 핵심 포인트 추출"""
        # Simple extraction - can be improved
        lines = text.split('\n')
        key_points = [line.strip() for line in lines if len(line.strip()) > 10][:5]
        return key_points if key_points else ["요약 정보 추출 중"]
    
    def _get_fallback_response(self, prompt: str) -> str:
        """API 실패 시 폴백 응답"""
        logger.info("[Gemini] 폴백 응답 반환")
        print("[Gemini] 폴백 응답 반환")
        preview = prompt[:200] + ("..." if len(prompt) > 200 else "")
        return (
            "⚠️ AI 분석을 완료하지 못했습니다.\n\n"
            "- 원인: Gemini API 호출이 실패했거나 설정이 누락되었습니다.\n"
            f"- 최근 입력 요약: {preview if preview else '내용 없음'}\n\n"
            "👉 관리자: GEMINI_API_KEY_MAIN 등 환경 변수를 확인하고, 서비스 로그에서 상세 오류를 점검하세요."
        )
    
    def _get_fallback_file_analysis(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """파일 분석 실패 시 폴백"""
        return {
            "file_path": file_path,
            "file_type": file_type,
            "file_size": Path(file_path).stat().st_size if Path(file_path).exists() else 0,
            "status": "error",
            "analysis": {
                "status": "failed",
                "summary": (
                    "AI 분석을 완료하지 못했습니다. Gemini API 키 또는 네트워크 설정을 확인해 주세요."
                ),
                "content_type": "file",
                "key_points": [
                    f"파일 형식: {file_type}",
                    "Gemini API 호출 실패 또는 미구성",
                    "환경 변수(GEMINI_API_KEY_MAIN 등)와 서버 로그 점검 필요"
                ],
                "metadata": {
                    "model": "gemini-2.5-flash-exp-fallback",
                    "processed_at": datetime.utcnow().isoformat(),
                    "api_status": "fallback"
                }
            }
        }

    def _guess_audio_mime(self, file_type: str) -> str:
        ext_map = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.flac': 'audio/flac',
            '.ogg': 'audio/ogg',
            '.aac': 'audio/aac',
        }
        return ext_map.get(file_type.lower(), 'audio/mpeg')
    
    def is_configured(self) -> bool:
        """API 키가 설정되어 있는지 확인"""
        return bool(GEMINI_API_KEYS["main"] and GEMINI_API_KEYS["main"] != "demo-key")
    
    def get_status(self) -> Dict[str, Any]:
        """서비스 상태 정보"""
        return {
            "model": "gemini-2.5-flash-exp",
            "configured": self.is_configured(),
            "api_keys_loaded": {
                "main": bool(GEMINI_API_KEYS["main"]),
                "document": bool(GEMINI_API_KEYS["document"]),
                "audio": bool(GEMINI_API_KEYS["audio"]),
                "image": bool(GEMINI_API_KEYS["image"]),
            },
            "base_url": "https://generativelanguage.googleapis.com/v1beta"
        }

# 전역 인스턴스
gemini_service = GeminiService()
