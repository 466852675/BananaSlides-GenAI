@echo off
chcp 65001 >nul

cd /d %~dp0..
echo ========================================
echo   BananaSlides Database Repair Tool
echo ========================================
echo.
echo.
echo WARNING: This will DELETE your current database and all its data!
echo This action cannot be undone.
echo.
set /p confirm="Are you sure you want to proceed? (y/n): "
if /i not "%confirm%"=="y" (
    echo Operation cancelled by user.
    pause
    exit /b
)
echo.
echo [1/3] Stopping Node.js processes to release file locks...
taskkill /F /IM node.exe
echo.

echo [2/3] Cleaning up corrupted database files...
if exist "server\prisma\dev.db" (
    del "server\prisma\dev.db"
    echo Deleted dev.db
)
if exist "server\prisma\dev.db-journal" (
    del "server\prisma\dev.db-journal"
    echo Deleted dev.db-journal
)
echo.

echo [3/3] Re-initializing database...
call "scripts\初始化数据库.bat"

echo.
echo ========================================
echo   Repair Complete!
echo ========================================
echo You can now launch the app with 'scripts\启动应用.bat'
pause
