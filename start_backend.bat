@echo off
echo Starting MinerU Backend Proxy on Port 1111...
cd /d %~dp0server
npm run dev
pause
