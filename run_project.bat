@echo off
title PaySure Runner
echo ==========================================
echo    PaySure - Project Runner
echo ==========================================
echo.

:: Start Backend in a new window
echo [SERVER] Starting FastAPI Backend...
start "PaySure Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload"

:: Start Frontend in a new window
echo [CLIENT] Starting Vite Frontend...
start "PaySure Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo    Services are starting in new windows.
echo    Backend: http://localhost:8000/docs
echo    Frontend: http://localhost:5173
echo ==========================================
echo.
pause
