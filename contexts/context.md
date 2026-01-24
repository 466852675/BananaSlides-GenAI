# 项目核心上下文 (Project Context)

> **⚠️ 重要：此文件定义了项目级的核心行为规范，所有 AI 助手必须优先遵守。**

## 1. 首要原则 (Prime Directives)
- **始终使用中文回答**：无论用户使用何种语言提问（除非明确要求翻译），回复必须使用中文。
- **中文原生协议 v5.0**：
    - **输出语言**：所有解释、计划 (Plans)、任务 (Tasks)、验证报告 (Walkthroughs)、提交信息 (Commit Messages) **必须**使用中文。
    - **技术术语**：保留英文 (如 API, JWT, Docker, path)。
    - **代码相关**：保留英文 (如 `functionName`, `file_path`)。

## 2. 项目信息
- **项目名称**：BananaSlides-GenAI
- **核心功能**：AI 智能生成 PPT
- **前端端口**：1000
- **后端端口**：1111
- **数据库**：SQLite (`server/prisma/dev.db`)

## 3. 运维规范
- **启动方式**：使用根目录下的 `一键启动.bat`。
- **脚本位置**：所有维护脚本位于 `scripts/` 目录。
- **数据安全**：
    - 严禁直接运行原生的 `prisma migrate reset`，必须使用 `scripts/强制重置数据库(慎用).bat`。
    - 启动时会自动备份数据，保留最近 10 份。
- **开发流程**：
    - **自动化测试**：每个功能开发完成后，必须主动询问用户是否触发 `automated_testing` 技能进行验证。


## 4. Git 提交规范
- 使用 `auto_commit` 技能或参照以下格式：
  ```text
  <type>: <emoji> <summary>
  ```
- **Type**: `feat`, `fix`, `refactor`, `docs`, `chore`
