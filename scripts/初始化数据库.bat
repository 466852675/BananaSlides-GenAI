@echo off
chcp 65001 >nul

cd /d %~dp0..
echo ========================================
echo   YH-AI 智能PPT创作平台 Database Initialization
echo ========================================
echo.

cd server
echo Generating Prisma Client...
call npx prisma generate
echo.
echo Pushing database schema...
call npx prisma db push
cd ..

echo.
echo Database initialized successfully!
echo You can now run 'scripts\启动应用.bat' to start the application.
pause
