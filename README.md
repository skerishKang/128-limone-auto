# 🍋 Limone Auto - 모듈형 AI 허브

**Desktop**: 대시보드(30%) + 채팅(70%)  
**Mobile**: 채팅(100%) - 동일한 컴포넌트 사용

## 🚀 기술 스택

### Frontend
- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 유틸리티 CSS
- **Custom Hooks** - 로직 분리

### Backend
- **FastAPI** - Python 웹 프레임워크
- **SQLite** - 로컬 데이터베이스
- **WebSocket** - 실시간 통신
- **Uvicorn** - ASGI 서버

### AI
- **Gemini 2.0 Flash** - 다중 계정 지원
- **파일 처리** - PDF, 이미지, 문서 분석

## 📁 프로젝트 구조

```
128-limone-auto/
├── frontend/                 # Next.js Frontend
│   ├── components/
│   │   ├── chat/            # 💬 채팅 컴포넌트
│   │   ├── dashboard/       # 📊 대시보드 위젯 (예정)
│   │   ├── mobile/          # 📱 모바일 전용 (예정)
│   │   └── shared/          # 🔧 공통 컴포넌트
│   ├── hooks/               # Custom Hooks
│   ├── services/            # API 서비스
│   ├── pages/               # 페이지 컴포넌트
│   └── styles/              # 전역 스타일
│
├── backend/                  # FastAPI Backend
│   ├── routers/             # API 라우터
│   │   ├── chat.py          # 채팅 API
│   │   ├── files.py         # 파일 업로드 API
│   │   ├── gmail.py         # Gmail 연동 (예정)
│   │   ├── calendar.py      # 캘린더 연동 (예정)
│   │   ├── telegram.py      # 텔레그램 연동 (예정)
│   │   └── drive.py         # Drive 연동 (예정)
│   ├── services/            # 비즈니스 로직
│   ├── database/            # SQLite DB
│   ├── websocket/           # WebSocket 핸들러
│   └── utils/               # 유틸리티
│
├── uploads/                  # 파일 저장소
├── data/                     # SQLite DB
├── logs/                     # 로그 파일
└── docs/                     # 문서
```

## 🎯 개발 진행 상황

### ✅ Phase 1: 채팅 기능 (완료)
- [x] Backend: FastAPI 서버 + SQLite DB
- [x] Backend: 채팅 API (대화 생성, 메시지 전송)
- [x] Backend: WebSocket 실시간 통신
- [x] Frontend: 채팅 UI (Container, Bubble, Input)
- [x] Frontend: Custom Hooks (useChat, useConversations)
- [x] Frontend: 메인 페이지 (사이드바 + 채팅)

### 🔄 Phase 2: 파일 처리 (진행 중)
- [x] Backend: 파일 업로드 API
- [ ] Backend: Gemini AI 연동
- [ ] Frontend: 파일 업로드 UI
- [ ] Frontend: 파일 처리 결과 표시

### 📋 Phase 3-6: 외부 서비스 (예정)
- [ ] Gmail API 연동 + 위젯
- [ ] Google Calendar 연동 + 위젯
- [ ] Telegram Bot 연동 + 위젯
- [ ] Google Drive 연동 + 위젯

### 🎨 Phase 7-8: UI 완성
- [ ] 대시보드 레이아웃
- [ ] 모바일 최적화 + PWA

## 🚀 시작하기

### Backend 실행
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
→ http://localhost:8000/docs 에서 API 확인

### Frontend 실행
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:3000 에서 앱 확인

## 📝 주요 기능

### 1. 채팅
- ✅ 새 대화 생성
- ✅ 메시지 전송/수신
- ✅ 대화 목록 표시
- ✅ 실시간 통신 (WebSocket)
- 🔄 AI 응답 (Gemini 연동 예정)

### 2. 파일 처리
- ✅ 기본 업로드 API
- 🔄 AI 분석 (Gemini 연동 예정)
- 🔄 결과 표시

### 3. 대시보드 (예정)
- Gmail 위젯 📧
- Calendar 위젯 📅
- Telegram 위젯 💬
- Drive 위젯 📁

### 4. 모바일 (예정)
- 반응형 채팅 UI
- PWA 설정
- 오프라인 모드

## 🛠️ 개발 가이드라인

### 코드 품질
- **파일 크기**: 최대 250줄
- **함수 크기**: 최대 50줄
- **타입**: TypeScript strict mode
- **명명**: 명확하고 일관성 있게

### 모듈 분리
```
하나의 파일 = 하나의 책임
├── ChatContainer → 채팅 레이아웃만
├── MessageBubble → 메시지 표시만
├── ChatInput → 입력 처리만
└── useChat → 채팅 로직만
```

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Limone.dev

---

**버전**: 1.0.0  
**최종 업데이트**: 2024-11-07
