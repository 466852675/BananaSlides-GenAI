# BananaSlides-GenAI (AI 智能生成 PPT)

一个基于 AI (Gemini/OpenAI) 的智能 PPT 生成与设计平台。

## 🌟 特性

- **AI 智能生成**: 一键生成演示文稿大纲与详细内容。
- **智能排版**: 自动匹配精美模板与布局。
- **混合引擎**: 支持多种 AI 模型 (Gemini, GPT-4, DeepSeek 等)。
- **实时编辑**: 所见即所得的幻灯片编辑器。

## 🛠️ 技术栈

- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: Express, SQLite (Prisma), Node.js
- **AI**: Google GenAI SDK, OpenAI Compatible API

## 🚀 快速启动

### 1. 后端服务 (Backend)

后端运行在 `http://localhost:1111`，负责 AI 代理、数据库存取与文件上传。

```bash
cd server
npm install
npx prisma migrate dev  # 初始化数据库
npm run dev
```

### 2. 前端应用 (Frontend)

前端运行在 `http://localhost:1000` (或其他 Vite 分配端口)。

```bash
# 在根目录下
npm install
npm run dev
```

## ⚙️ 环境变量

后端 `.env` 配置示例 (`server/.env`):

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-gemini-key"
PORT=1111
```

## 📁 目录结构

- `/server`: 后端代码 root
  - `src/services/ai.service.ts`: AI 核心逻辑
  - `src/controllers`: API 控制器
  - `prisma/`: 数据库 Schema
- `/src`: 前端代码 root
  - `components/`: React 组件
  - `services/`: 前端服务 (API 调用)

---

_Built with ❤️ by BananaSlides Team_
