# 🎯 멀티모달 AI 파일 분석 기능 가이드

## 📋 **개요**

메시지에서 파일을 업로드하면 **AI가 자동으로 분석**하고 **요약/저장**해드립니다!

## 🎨 **지원하는 파일 타입**

### 1️⃣ **사진 (Image)**
- **확장자**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- **AI 분석**:
  - ✅ 이미지 내용 설명
  - ✅ 주요 개체 감지
  - ✅ 텍스트 추출 (OCR)
  - ✅ 이미지 요약
  - ✅ 감정 분석

### 2️⃣ **문서 (Document)**
- **확장자**: `.pdf`, `.doc`, `.docx`, `.txt`, `.md`, `.csv`, `.json`
- **AI 분석**:
  - ✅ 핵심 내용 추출
  - ✅ 문서 요약
  - ✅ 주요 포인트 정리
  - ✅ 감정 분석
  - ✅ 문서 유형 분류

### 3️⃣ **오디오 (Audio)**
- **확장자**: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`
- **AI 분석**:
  - ✅ 음성 전사 (STT)
  - ✅ 내용 요약
  - ✅ 화자 분리
  - ✅ 감정 분석

### 4️⃣ **기타 파일 (Other)**
- **기타 모든 파일**
- **AI 분석**:
  - ✅ 파일 메타데이터 추출
  - ✅ 파일 유형별 분석
  - ✅ 기본 정보 요약

---

## 🔄 **업로드 → AI 분석 → 저장 플로우**

```
1. 사용자 파일 업로드
   ↓
2. 백엔드에서 파일 타입 감지
   ↓
3. AI 분석 실행
   - 이미지 → Gemini Vision API
   - 문서 → Gemini Pro API
   - 오디오 → Gemini Pro + STT
   - 기타 → 기본 분석
   ↓
4. 분석 결과를 Markdown으로 저장
   ↓
5. 사용자에게 분석 결과 반환
```

---

## 📁 **저장 구조**

```
uploads/                    # 원본 파일
  ├── image1.jpg
  ├── document.pdf
  └── audio.mp3

summaries/                  # AI 분석 결과
  ├── image1.ai_summary.md
  ├── document.ai_summary.md
  └── audio.ai_summary.md
```

---

## 🛠️ **구현 현황**

### ✅ **완료**
- [x] 파일 타입 감지 로직
- [x] 백엔드 API 엔드포인트
- [x] AI 분석 프롬프트 템플릿
- [x] 요약 파일 저장 기능
- [x] API 응답 구조
- [x] **Gemini AI 실제 연동**
  - [x] Gemini Pro Vision API (이미지)
  - [x] Gemini Pro API (문서/텍스트)
  - [x] 오디오 파일 분석
- [x] Markdown 요약 저장
- [x] API 테스트 가이드
- [x] 환경변수 (.env) 설정

### ⏳ **구현 예정**
- [ ] **프론트엔드 UI 개선**
  - [ ] 드래그 앤 드롭 업로드
  - [ ] 업로드 진행률 표시
  - [ ] 분석 결과 미리보기
- [ ] **고급 기능**
  - [ ] 음성 전사 (Whisper API 연동)
  - [ ] 화자 분리 (오디오)
  - [ ] OCR 텍스트 추출 개선 (이미지)
  - [ ] 감정 분석
  - [ ] 다국어 지원
  - [ ] 배치 파일 업로드

---

## 🔧 **기술 스택**

### **백엔드**
- **FastAPI** - API 서버
- **Google Gemini AI** - 멀티모달 분석
  - `gemini-pro-vision` - 이미지 분석
  - `gemini-pro` - 텍스트/문서 분석
  - `gemini-1.5-flash` - 고속 분석
- **Python libraries**
  - `mimetypes` - 파일 타입 감지
  - `pathlib` - 경로 관리
  - `markdown` - 결과 포맷팅

### **프론트엔드**
- **Next.js** - React 프레임워크
- **React** - UI 라이브러리
- **Tailwind CSS** - 스타일링
- **Axios** - HTTP 클라이언트

---

## 📖 **사용 예시**

### **1. 이미지 업로드**
```
📤 업로드: photo.jpg
🤖 AI 분석: "이 이미지는 도시의 야경 사진으로,
              高楼大厦灯火辉煌, 차들이 지나다니는 모습을 담았습니다..."

📄 저장: summaries/photo.ai_summary.md
```

### **2. 문서 업로드**
```
📤 업로드: report.pdf
🤖 AI 분석: "이 보고서는 2024년 4분기 판매 분석을 담고 있습니다.
              주요 포인트: 매출 15% 증가, 온라인 채널 확대..."

📄 저장: summaries/report.ai_summary.md
```

### **3. 오디오 업로드**
```
📤 업로드: meeting.mp3
🤖 AI 분석: "회의에서 다룬 내용:
               1. 신제품 출시 일정
               2. 마케팅 예산
               3. 타겟 고객층..."

📄 저장: summaries/meeting.ai_summary.md
```

---

## 🎯 **향후 확장 가능성**

1. **多파일 일괄 분석**
   - 여러 파일을 동시에 업로드
   - 파일 간 연관성 분석

2. **대화형 분석**
   - 분석 결과에 대한 질문/답변
   - 심화 분석 요청

3. **실시간 분석**
   - 녹음 중 실시간 전사
   - 라이브 스트림 분석

4. **AI 요약 스토리텔링**
   - 파일들을 연결하여 종합 분석
   - 스토리텔링 형태로 결과 생성

---

## 🚀 **시작하기**

### **1. 백엔드 설정 및 실행**
```bash
cd backend
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 설정 (https://makersuite.google.com/app/apikey)

# 백엔드 실행
python main.py
```

### **2. 프론트엔드 실행**
```bash
cd frontend
npm run dev
```

### **3. API 테스트**
```bash
# curl로 파일 업로드 테스트
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/image.jpg"
```

### **4. 웹 UI 테스트**
1. **http://localhost:3000** 접속
2. **대시보드** → **Drive 위젯** 클릭
3. **파일 업로드** 섹션으로 이동
4. **이미지/문서/오디오** 파일 업로드
5. **AI 분석 결과** 확인 (요약 탭에서 조회)

### **5. API 문서**
- Swagger UI: **http://localhost:8000/docs**
- "Files" 섹션에서 API 테스트 가능

---

## 💡 **팁 & 노하우**

### **최적의 결과를 위한 파일 조건**

**이미지**
- ✅ 고해상도 (최소 512x512)
- ✅ 선명한 텍스트 (OCR 정확도 향상)
- ✅ 명확한 개체 (물체/인물)

**문서**
- ✅ 텍스트가 포함된 파일
- ✅ 구조화된 내용 (목차, 섹션)
- ✅ 적절한 크기 (1-50MB)

**오디오**
- ✅ 명확한 음질
- ✅ 적당한 길이 (최대 10분)
- ✅ 배경 소음 최소화

---

## 🐛 **문제 해결**

### **Q: AI 분석이 작동하지 않아요**
**A**: Gemini API 키가 설정되어 있는지 확인하세요

### **Q: 오디오 파일이 인식되지 않아요**
**A**: 지원 형식인지 확인: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`

### **Q: 분석 결과가 부정확해요**
**A**: 파일 품질과 크기를 확인하세요. 더 선명한 파일을 사용해보세요

### **Q: 분석이 너무 오래 걸려요**
**A**: 파일 크기를 줄이거나 `gemini-1.5-flash`를 사용하세요

---

## 📞 **지원**

문제가 있거나 개선사항이 있으시면:
- GitHub Issue 등록
- 개발팀에 문의
- 기능 요청제출

---

**🎉 재미있는 AI 파일 분석 경험 되세요!**
