# 🔧 ngrok 설정하기 (배포 후)

## 📋 현재 상황
- ✅ **Netlify 배포 완료**: https://limone-auto.netlify.app
- ⏳ **ngrok 설정 필요**
- ⏳ **백엔드 연결 필요**

---

## 🚀 설정 순서 (5분 완료!)

### 1️⃣ 백엔드 실행하기

**새 터미널**을 열고:
```bash
cd backend
python main.py
```

✅ **확인 메시지**가 나타나면 OK:
```
🚀 Limone Auto Backend Started!
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
```

---

### 2️⃣ ngrok 실행하기

**또 다른 새 터미널**을 열고:
```bash
ngrok http 8000
```

**화면에 이런 게 나올 거예요:**
```
Session Status    online
Forwarding        https://abc123-def456.ngrok.io -> http://localhost:8000
```

---

### 3️⃣ ngrok URL 확인하기

**중요**: `Forwarding` 뒤의 **HTTPS 주소**를 복사하세요:
- 예: `https://abc123-def456.ngrok.io`

**이 주소를メモ해두세요!**

---

### 4️⃣ Netlify 환경변수 설정하기

1. [Netlify](https://app.netlify.com) 접속
2. **"limone-auto"** 사이트 클릭
3. **Site settings** → **Environment variables** 클릭
4. **`NEXT_PUBLIC_API_URL`** 변수 클릭
5. **Value** 입력: `https://abc123-def456.ngrok.io` (방금 복사한 ngrok URL)
6. **"Save changes"** 클릭
7. **"Deploys"** 탭 → **"Trigger deploy"** → **"Deploy site"** 클릭

---

### 5️⃣ 백엔드 CORS 수정하기

**backend/main.py** 파일을 열어서 **17-21줄** 수정:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://limone-auto.netlify.app",  # ★ 이 줄 추가!
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**저장하고 백엔드 재시작**:
- 터미널에서 `Ctrl+C`로停止
- 다시 `python main.py` 실행

---

## ✅ 최종 확인

### 브라우저에서 접속
1. **https://limone-auto.netlify.app** 열기
2. **개발자 도구** (F12) → **Console** 탭
3. **CORS 에러**가 없으면 성공! 🎉

### 수동 테스트
**http://localhost:8000/docs** 열어서:
- API 문서가 나오면 백엔드 정상 실행 중

---

## ⚠️ ngrok 주소가 계속 바뀜

ngrok을 다시 시작할 때마다 새 주소가 생성됩니다:
- 예: `https://abc123.ngrok.io` → `https://xyz789.ngrok.io`

**해결방법**:
1. ngrok 재시작
2. **새 ngrok URL**을 복사
3. **Netlify 환경변수** 업데이트
4. **Netlify 배포** 재실행

---

## 📱 한 줄 요약

```
1. 백엔드 실행: cd backend && python main.py
2. ngrok 실행: ngrok http 8000
3. ngrok URL 복사: https://abc123.ngrok.io
4. Netlify 환경변수 업데이트
5. CORS에 limone-auto.netlify.app 추가
```

**지금 바로 해보세요!** 🚀
