@echo off
echo Starting BananaSlides-GenAI...

:: Start Backend and Frontend in parallel (no waiting)
start "BananaSlides Backend (Port 1111)" cmd /k "cd server && npm run dev"
start "BananaSlides Frontend (Port 1000)" cmd /k "npm run dev"

echo.
echo ========================================
echo   Services started!
echo   Backend:  http://localhost:1111
echo   Frontend: http://localhost:1000
echo ========================================
echo.
echo Note: First time? Run 'init_db.bat' to setup database.
