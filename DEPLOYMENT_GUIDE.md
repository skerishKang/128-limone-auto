# Deployment Guide - Limone Auto

## 📋 Current Status

### ✅ Completed Setup
1. **UI Improvements**
   - Tooltips now show only on hover (not permanently visible)
   - Dashboard widgets reordered:
     - Column 1 (left): Calendar, Todo (planning)
     - Column 2 (right): Telegram, Gmail (real-time monitoring)
   - Summary cards (weather, status, quick actions) added to top

2. **Environment Configuration**
   - Frontend: `NEXT_PUBLIC_API_URL` environment variable
   - Local: `http://localhost:8000`
   - Production: Ready for your backend URL

3. **API Service Updated**
   - No more hardcoded URLs
   - Uses environment variable with fallback
   - WebSocket URL dynamically generated

4. **CORS Ready**
   - Backend configured with commented placeholder
   - Ready for production domain

5. **Static Export**
   - Built successfully
   - Output: `frontend/out/` directory
   - Ready for Netlify deployment

---

## 🚀 Next Steps for Deployment

### Step 1: Deploy Frontend to Netlify

1. Go to [Netlify](https://www.netlify.com)
2. Click "New site from Git"
3. Connect your repository
4. Configure build settings:
   - **Branch**: `main`
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/out`
5. Click "Deploy site"

### Step 2: Set Production Environment Variable

In Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://your-backend-url.ngrok.io` (or your actual backend server)

### Step 3: Update Backend CORS (After Frontend Deployed)

1. Note your Netlify domain (e.g., `https://amazing-site-123.netlify.app`)
2. Edit `backend/main.py`:
   ```python
   allow_origins=[
       "http://localhost:3000",
       "http://127.0.0.1:3000",
       "https://your-netlify-domain.netlify.app",  # Add this
   ],
   ```
3. Restart backend server

### Step 4: Start Backend with ngrok (for local development)

If you want to test production frontend with local backend:

1. **Start your backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **In another terminal, start ngrok:**
   ```bash
   ngrok http 8000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Update Netlify environment variable:**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://abc123.ngrok.io`

5. **Update backend CORS:**
   ```python
   allow_origins=[
       "https://your-netlify-domain.netlify.app",
       "https://abc123.ngrok.io",  # Add ngrok URL
   ],
   ```

---

## 🔧 Alternative: Deploy Backend to Server

Instead of using ngrok, you can deploy the backend to a cloud server (AWS, DigitalOcean, Heroku, etc.) and use that URL in the `NEXT_PUBLIC_API_URL` environment variable.

---

## 📁 File Structure

```
limone-auto/
├── frontend/                  # Next.js frontend (deploy to Netlify)
│   ├── .env.local            # Local development
│   ├── .env.production       # Production template
│   ├── .env.example          # Environment variable examples
│   ├── out/                  # Static export (build output)
│   ├── services/api.ts       # API service (uses env vars)
│   └── next.config.js        # Static export config
│
├── backend/                   # FastAPI backend
│   ├── main.py               # CORS configuration
│   └── ... (other backend files)
│
└── DEPLOYMENT_GUIDE.md       # This file
```

---

## 🐛 Troubleshooting

### Frontend not connecting to backend
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify CORS in `backend/main.py` includes your domain
- Check browser console for CORS errors

### Changes not reflecting
- Clear browser cache
- Check Netlify build logs
- Verify environment variables are set

### WebSocket connection fails
- Backend must be running
- Check CORS includes your domain
- Verify ngrok tunnel is active (if using)

---

## 📞 Summary

You're all set! The application is ready for deployment:

1. **Frontend**: Deploy `frontend/out/` to Netlify
2. **Backend**: Keep running locally or deploy to server
3. **Environment**: Set `NEXT_PUBLIC_API_URL` in Netlify
4. **CORS**: Add your Netlify domain to backend CORS settings

For local testing with production build:
- Run backend: `cd backend && python main.py`
- Run ngrok: `ngrok http 8000`
- Update Netlify env var with ngrok URL
- Update backend CORS with both URLs
