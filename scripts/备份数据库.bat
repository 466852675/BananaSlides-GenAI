@echo off
chcp 65001 >nul

setlocal
cd /d %~dp0..
echo ========================================
echo   BananaSlides Database Backup Tool
echo ========================================
echo.

set DB_PATH=server\prisma\dev.db
set BACKUP_DIR=server\prisma

if not exist "%DB_PATH%" (
    echo [ERROR] Database file not found at: %DB_PATH%
    echo Cannot perform backup.
    goto :end
)

:: Get current timestamp (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

set BACKUP_FILE=%BACKUP_DIR%\dev.db.backup_%TIMESTAMP%
set LATEST_BACKUP=%BACKUP_DIR%\dev.db.backup

echo [1/2] Creating timestamped backup...
copy "%DB_PATH%" "%BACKUP_FILE%" >nul
if %errorlevel% neq 0 (
    echo [FAIL] Failed to create timestamped backup.
) else (
    echo [OK] Backup saved to: %BACKUP_FILE%
)

echo [2/2] Updating 'latest' backup pointer...
copy /Y "%DB_PATH%" "%LATEST_BACKUP%" >nul
if %errorlevel% neq 0 (
    echo [FAIL] Failed to update latest backup.
) else (
    echo [OK] Latest backup updated.
)

:: Cleanup: Keep only last 10 backups
echo [Cleanup] Checking for old backups...
for /f "skip=10 delims=" %%F in ('dir /b /o-d /t:c "%BACKUP_DIR%\dev.db.backup_*" 2^>nul') do (
    del "%BACKUP_DIR%\%%F"
    echo [Deleted] Old backup: %%F
)

:end
echo.
echo Backup process finished.
if "%1" neq "--silent" pause
endlocal
