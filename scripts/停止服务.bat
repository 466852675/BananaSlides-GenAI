@echo off
chcp 65001 >nul

cd /d %~dp0..
cls
echo ============================================================
echo   YH-AI 智能PPT创作平台 Stop Services
echo ============================================================
echo.

echo Stopping services...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1111 ^| findstr LISTENING 2^>nul') do (
    echo    - Stopping backend (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1000 ^| findstr LISTENING 2^>nul') do (
    echo    - Stopping frontend (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Services stopped.
echo.
pause
