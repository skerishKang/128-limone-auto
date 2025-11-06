@echo off
echo ========================================
echo   Limone Auto - Development Server
echo ========================================
echo.

echo [1/3] Starting Backend...
cd backend
start "Limone Backend" cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python main.py"
timeout /t 3 /nobreak > nul

echo [2/3] Starting Frontend...
cd ..\frontend
start "Limone Frontend" cmd /k "npm install && npm run dev"
timeout /t 2 /nobreak > nul

echo [3/3] Opening Browser...
start http://localhost:3000

echo.
echo ========================================
echo   Servers are running!
echo   - Backend:  http://localhost:8000
echo   - Frontend: http://localhost:3000
echo ========================================
echo.

pause
