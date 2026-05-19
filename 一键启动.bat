@echo off
chcp 65001 >nul

:: 设置窗口标题和颜色
title 🚀 YH-AI 智能PPT创作平台 一键启动
color 0A

:: 调用优化后的启动脚本
call "scripts\启动应用.bat"

:: 保持窗口打开
echo.
echo 按任意键关闭此窗口...
pause >nul
