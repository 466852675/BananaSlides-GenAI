@echo off
chcp 65001 >nul

cd /d %~dp0..
echo Starting BananaSlides-GenAI...
    
echo [Auto-Backup] Creating database snapshot...
call "scripts\备份数据库.bat" --silent


echo [0/2] Cleaning up existing Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo Cleanup complete.

:: Ensure Database Schema is Up-to-Date (Auto-Fix)
echo [0.5/2] Applying Database Schema Updates...
cd server
call npx prisma db push
cd ..
echo Schema update check complete.

:: Start Backend first
echo [1/2] Starting Backend Server...
start "BananaSlides Backend (Port 1111)" cmd /k "cd server && npm run dev || pause"

:: Wait for backend to initialize
echo [2/2] Waiting for backend to start (3 seconds)...
timeout /t 3 /nobreak >nul

:: Start Frontend
echo Starting Frontend...
start "BananaSlides Frontend (Port 1000)" cmd /k "npm run dev || pause"

echo.
echo ========================================
echo   Services started!
echo   Backend:  http://localhost:1111
echo   Frontend: http://localhost:1000
echo ========================================
echo.
echo Note: First time? Run 'scripts\初始化数据库.bat' to setup database.
echo.
echo If you see connection errors, check if BOTH windows opened.
echo Backend window title: "BananaSlides Backend (Port 1111)"
echo Frontend window title: "BananaSlides Frontend (Port 1000)"
