@echo off
echo ========================================
echo   BananaSlides Database Initialization
echo ========================================
echo.

cd ../server
echo Generating Prisma Client...
call npx prisma generate
echo.
echo Pushing database schema...
call npx prisma db push
cd ../scripts

echo.
echo Database initialized successfully!
echo You can now run '项目启动控制台.bat' to start the application.
pause
