---
description: 初始化并启动 BananaSlides-GenAI 项目 (AI 智能 PPT 生成平台)
---

# 项目初始化工作流

本工作流用于完整初始化并启动 BananaSlides-GenAI 项目，包括后端和前端服务。

## 前置条件

- Node.js v18+ 已安装
- npm 或 pnpm 已安装

## 初始化步骤

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 初始化数据库 (Prisma)

```bash
cd server
npx prisma migrate dev
```

> **注意**: 如果是首次运行，Prisma 会创建 SQLite 数据库文件 `dev.db`。

### 3. 安装前端依赖

```bash
# 在项目根目录
npm install
```

### 4. 配置环境变量

后端环境变量 (`server/.env`):

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-gemini-api-key"
PORT=1111
```

前端环境变量 (`.env.local`):

```env
VITE_API_BASE_URL=http://localhost:1111
```

## 启动服务

### 5. 启动后端服务

// turbo

```bash
cd server && npm run dev
```

后端将运行在 `http://localhost:1111`。

### 6. 启动前端服务 (新终端)

// turbo

```bash
npm run dev
```

前端将运行在 `http://localhost:1000` (或 Vite 分配的其他端口)。

## 快速启动 (一键启动)

如果项目已初始化，可以使用根目录的批处理脚本：

```bash
./start_app.bat
```

## 项目结构概览

| 目录          | 描述                             |
| :------------ | :------------------------------- |
| `/src`        | 前端 React 代码                  |
| `/server`     | 后端 Express + Prisma 代码       |
| `/server/src` | 后端核心逻辑 (AI 服务、控制器等) |
| `/docs`       | 项目文档                         |

## 常用命令

| 命令                       | 描述                       |
| :------------------------- | :------------------------- |
| `npm run dev`              | 启动前端开发服务器         |
| `cd server && npm run dev` | 启动后端开发服务器         |
| `npm run build`            | 构建前端生产版本           |
| `npx prisma studio`        | 打开 Prisma 数据库管理界面 |
