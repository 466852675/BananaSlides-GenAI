@echo off
echo ========================================
echo   BananaSlides Database Repair Tool
echo ========================================
echo.
echo [1/3] Stopping Node.js processes to release file locks...
taskkill /F /IM node.exe
echo.

echo [2/3] Cleaning up corrupted database files...
if exist "..\server\prisma\dev.db" (
    del "..\server\prisma\dev.db"
    echo Deleted dev.db
)
if exist "..\server\prisma\dev.db-journal" (
    del "..\server\prisma\dev.db-journal"
    echo Deleted dev.db-journal
)
echo.

echo [3/3] Re-initializing database...
call 数据库初始化库.bat

echo.
echo ========================================
echo   Repair Complete!
echo ========================================
echo You can now launch the app with '项目启动控制台.bat'
pause
