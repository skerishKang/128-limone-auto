# 🧪 AI 파일 분석 API 테스트 가이드

## 📋 준비사항

1. **백엔드 실행**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 설정
python main.py
```

2. **API 키 발급**
- https://makersuite.google.com/app/apikey
- Google AI Studio에서 Gemini API 키 발급
- `.env` 파일에 `GEMINI_API_KEY=발급받은키` 입력

---

## 🚀 API 엔드포인트 테스트

### 1️⃣ 파일 업로드 및 AI 분석
**URL**: `POST http://localhost:8000/api/files/upload`

**curl 예시**:
```bash
# 이미지 파일
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/image.jpg"

# 문서 파일
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/document.pdf"

# 오디오 파일
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/audio.mp3"
```

**성공 응답 예시**:
```json
{
  "filename": "image.jpg",
  "file_type": "image/jpeg",
  "category": "image",
  "analysis_result": "이 이미지는 도시의 야경 사진으로, 높은 건물들이灯火辉煌하며 밤하늘을 배경으로 그려져 있습니다. 차들이 지나다니는 도로와 건물의 조명 때문에 활동적인 도시의 밤을 보여주고 있으며, 전반적으로 웅장하고现代化的한 분위기를 자아냅니다.",
  "summary_path": "../../summaries/image_image_ai_summary.md",
  "size": 1024000
}
```

### 2️⃣ 업로드된 파일 목록 조회
**URL**: `GET http://localhost:8000/api/files/list`

**curl 예시**:
```bash
curl -X GET "http://localhost:8000/api/files/list"
```

**응답 예시**:
```json
[
  {
    "filename": "image.jpg",
    "size": 1024000,
    "created_at": 1703123456.789
  },
  {
    "filename": "document.pdf",
    "size": 2048000,
    "created_at": 1703123567.123
  }
]
```

### 3️⃣ AI 분석 결과 목록 조회
**URL**: `GET http://localhost:8000/api/files/summaries`

**curl 예시**:
```bash
curl -X GET "http://localhost:8000/api/files/summaries"
```

**응답 예시**:
```json
[
  {
    "filename": "image_image_ai_summary.md",
    "path": "../../summaries/image_image_ai_summary.md",
    "size": 2048,
    "created_at": 1703123456.789
  }
]
```

### 4️⃣ 특정 파일의 분석 결과 조회
**URL**: `GET http://localhost:8000/api/files/summary/{filename}`

**curl 예시**:
```bash
curl -X GET "http://localhost:8000/api/files/summary/image.jpg"
```

**응답 예시**:
```json
{
  "filename": "image.jpg",
  "summary_path": "../../summaries/image_image_ai_summary.md",
  "content": "# image.jpg - AI 분석 결과\n\n## 📁 파일 정보\n- **파일명**: image.jpg\n- **카테고리**: IMAGE\n- **분석일**: 2024-01-01\n\n## 🤖 AI 분석 결과\n\n이 이미지는 도시의 야경 사진으로..."
}
```

### 5️⃣ 파일 및 요약 삭제
**URL**: `DELETE http://localhost:8000/api/files/delete/{filename}`

**curl 예시**:
```bash
curl -X DELETE "http://localhost:8000/api/files/delete/image.jpg"
```

**응답 예시**:
```json
{
  "message": "File image.jpg and its summary deleted"
}
```

---

## 🔧 Python requests로 테스트

```python
import requests

API_BASE = "http://localhost:8000/api/files"

# 파일 업로드 및 분석
with open("test_image.jpg", "rb") as f:
    response = requests.post(
        f"{API_BASE}/upload",
        files={"file": f}
    )
    print(response.json())

# 결과 조회
response = requests.get(f"{API_BASE}/list")
print(response.json())
```

---

## 📁 저장 구조

```
uploads/                    # 원본 파일 저장
  ├── image1.jpg
  ├── document.pdf
  └── audio.mp3

summaries/                  # AI 분석 결과 (Markdown)
  ├── image1_image_ai_summary.md
  ├── document_document_ai_summary.md
  └── audio_audio_ai_summary.md
```

---

## 🐛 문제 해결

### 오류: "GEMINI_API_KEY not found"
- `.env` 파일에 API 키가 설정되어 있는지 확인
- 백엔드 재시작 후 테스트

### 오류: "File upload failed"
- 파일 크기가 너무 크지 않은지 확인 (기본 10MB 제한)
- 파일 경로가 올바른지 확인

### 오류: "Analysis failed"
- API 키가 유효한지 확인
- 인터넷 연결 상태 확인
- Gemini API 할당량 확인

---

## 📊 API 응답 시간

- **이미지 분석**: 3-10초
- **문서 분석**: 2-5초 (크기에 따라)
- **오디오 분석**: 5-15초
- **기타 파일**: 즉시

---

## 💡 팁

1. **효율적인 사용**
   - 큰 파일은 압축 후 업로드
   - 문서는 텍스트 기반 형식 사용 권장
   - 이미지는 JPG, PNG 형식 권장

2. **API 키 관리**
   - `.env` 파일은 Git에 올리지 마세요
   - `.env.example` 파일로 템플릿 공유
   - 프로덕션에서는 환경변수로 관리

3. **테스트 데이터**
   - 다양한 파일 타입으로 테스트
   - 한국어 텍스트가 포함된 문서 권장
   - 고해상도 이미지 사용 권장

---

## 📖 Swagger UI

API 문서 및 인터랙티브 테스트:
- http://localhost:8000/docs
- "Files" 섹션에서 API 테스트 가능
