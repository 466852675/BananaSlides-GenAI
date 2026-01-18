@echo off
echo Starting BananaSlides-GenAI...

:: Start Backend first
echo [1/2] Starting Backend Server...
start "BananaSlides Backend (Port 1111)" cmd /k "cd ../server && npm run dev || pause"

:: Wait for backend to initialize
echo [2/2] Waiting for backend to start (3 seconds)...
timeout /t 3 /nobreak >nul

:: Start Frontend
echo Starting Frontend...
start "BananaSlides Frontend (Port 1000)" cmd /k "cd .. && npm run dev || pause"

echo.
echo ========================================
echo   Services started!
echo   Backend:  http://localhost:1111
echo   Frontend: http://localhost:1000
echo ========================================
echo.
echo Note: First time? Run '数据库初始化库.bat' to setup database.
echo.
echo If you see connection errors, check if BOTH windows opened.
echo Backend window title: "BananaSlides Backend (Port 1111)"
echo Frontend window title: "BananaSlides Frontend (Port 1000)"
