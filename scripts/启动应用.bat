@echo off
chcp 65001 >nul

cd /d %~dp0..
cls
echo ============================================================
echo   YH-AI 智能PPT创作平台 Startup Script v2.0
echo ============================================================
echo.

echo [1/5] Auto-backup database...
call "scripts\备份数据库.bat" --silent
echo.

echo [2/5] Cleaning up ports (1111, 1000)...
:: 只清理占用目标端口的进程，不杀所有 Node 进程
timeout /t 2 /nobreak >nul

:: 清理端口 1111
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1111 ^| findstr LISTENING 2^>nul') do (
    echo    - Killing process on port 1111 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
:: 清理端口 1000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1000 ^| findstr LISTENING 2^>nul') do (
    echo    - Killing process on port 1000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: 验证端口是否已释放
netstat -ano | findstr :1111 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo    [WARNING] Port 1111 still in use! Retrying...
    for /f "tokens=5" %%b in ('netstat -ano ^| findstr :1111 ^| findstr LISTENING 2^>nul') do (
        taskkill /F /PID %%b >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
)

echo    Done.
echo.


echo [3/5] Syncing database schema...
cd server
call npx prisma db push --skip-generate >nul 2>&1
cd ..
echo    Done.
echo.

echo [4/5] Starting Backend (Port 1111)...
start "YH-AI 智能PPT创作平台 Backend (Port 1111)" cmd /k "cd server && npm run dev || pause"

echo    Waiting for backend to be ready...
set WAIT_COUNT=0
:wait_backend
timeout /t 1 /nobreak >nul
netstat -ano | findstr :1111 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo    Backend ready!
    goto backend_ready
)
set /a WAIT_COUNT+=1
if %WAIT_COUNT% LSS 15 (
    echo    Waiting... (%WAIT_COUNT%s)
    goto wait_backend
)
echo    Warning: Backend startup timeout

:backend_ready
echo.

echo [5/5] Starting Frontend (Port 1000)...
start "YH-AI 智能PPT创作平台 Frontend (Port 1000)" cmd /k "npm run dev || pause"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   Services Started!
echo ============================================================
echo   Backend:  http://localhost:1111
echo   Frontend: http://localhost:1000
echo ============================================================
echo.
echo Tips:
echo   - First time? Run 'scripts\初始化数据库.bat'
echo   - Check both service windows for errors
echo   - Close service windows to stop
echo.
