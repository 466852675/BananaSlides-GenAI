**[English](./README.md) | [中文](./README.zh-CN.md)**

# YH-AI PPT - 智能演示文稿全链条设计平台

> 多模型 AI 引擎智能路由 —— 一句话，从想法到演示，分钟级交付。

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/) [![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](#) [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?logo=tailwind-css)](#) [![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)](#) [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](./LICENSE)

---

## 核心特性

- **智能生产力链路** — 一句话主题 → 结构化大纲 → 内容扩写 → AI 配图 → 多格式导出（PDF / 图片包 / PPTX）
- **多模型 AI 引擎** — Router-Adapter 适配器架构，支持 Gemini / OpenAI / 智谱 / DeepSeek / 火山引擎 / SiliconFlow / ModelScope / 本地 Ollama，按任务类型（文本/图片/视觉）自动路由，热切换无需重启
- **Agent 对话模式** — 自然语言驱动全流程 PPT 生成，9 大 AI 工具（Function Calling），引导/自动双执行模式，SSE + WebSocket 实时进度
- **设计资产智库** — 精品模版广场、AI 视觉风格提取、个人风格入库，4 层级 Prompt 合成引擎确保视觉一致性
- **MinerU 文档解析** — 工业级 PDF/Word 文档结构化提取
- **商业化 SaaS 基础设施** — 支付（支付宝/微信）、积分、VIP 会员、退款风控、消息中心、6 级 RBAC 权限体系，配置商户密钥即可上线

---

## 支持的 AI 提供商

[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google)](#) [![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?logo=openai)](#) [![Zhipu](https://img.shields.io/badge/Zhipu-GLM-4E79A7)](#) [![DeepSeek](https://img.shields.io/badge/DeepSeek-V3-0088CC)](#) [![Volcengine](https://img.shields.io/badge/Volcengine-Doubao-3370FF?logo=bytedance)](#) [![SiliconFlow](https://img.shields.io/badge/SiliconFlow-FLUX-7C3AED)](#) [![ModelScope](https://img.shields.io/badge/ModelScope-Qwen-FF6A00)](#) [![Ollama](https://img.shields.io/badge/Ollama-Local-000000?logo=ollama)](#)

---

## 功能展示

### 项目管理与看板

卡片式项目看板，支持任务实时状态追踪、优先级置顶、快速预览轮播，以及项目归档管理与二次复用。

![看板](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/02-%E6%95%8F%E6%8D%B7%E5%8D%8F%E4%BD%9C%E7%9F%A9%E9%98%B5/01-%E7%B3%BB%E7%BB%9F%E6%A6%82%E8%A7%88-%E9%A1%B9%E7%9B%AE%E5%8D%A1%E7%89%87%E5%BC%8F%E7%9C%8B%E6%9D%BF+%E5%A4%9A%E4%BB%BB%E5%8A%A1%E5%B9%B6%E8%A1%8C%E7%AE%A1%E7%90%86+%E4%B8%BA%E6%82%A8%E5%91%88%E7%8E%B0%E5%B7%A5%E4%B8%9A%E7%BA%A7%E7%9A%84%E7%94%9F%E4%BA%A7%E6%95%88%E7%8E%87.gif)

| |
|:---:|
| ![归档](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/07-%E8%87%AA%E5%8A%A8%E5%BD%92%E6%A1%A3-%E9%A1%B9%E7%9B%AE%E8%87%AA%E5%8A%A8%E5%BD%92%E6%A1%A3%E5%85%A5%E5%BA%93+%E4%BA%91%E7%AB%AF%E5%90%8C%E6%AD%A5%E7%AE%A1%E7%90%86+%E8%AE%A9%E6%82%A8%E7%9A%84%E6%AF%8F%E4%B8%80%E4%BB%BD%E5%8A%AA%E5%8A%9B%E9%83%BD%E6%9C%89%E8%BF%B9%E5%8F%AF%E5%BE%AA.gif) |

### AI 生产力链路

端到端自动化：主题 → 大纲 → 内容 → 配图 → 导出（PDF / 图片包 / PPTX）。支持版本回滚和资产复用。

![主题](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/00-%E5%BC%80%E5%90%AF%E5%A4%A7%E7%BA%B2-%E8%BE%93%E5%85%A5%E4%B8%80%E5%8F%A5%E8%AF%9D%E6%8F%8F%E8%BF%B0+AI%E4%BF%AE%E9%A5%B0%E7%94%9F%E6%88%90%E4%B8%BB%E9%A2%98+%E8%AE%A9%E6%82%A8%E7%9A%84PPT%E6%A0%87%E9%A2%98%E6%9B%B4%E6%9C%89%E4%B8%93%E4%B8%9A%E6%B7%B1%E5%BA%A6.gif)

| | |
|:---:|:---:|
| ![大纲](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/01-%E5%BC%80%E5%90%AF%E5%A4%A7%E7%BA%B2-%E7%BB%93%E6%9E%84%E5%8C%96%E5%A4%A7%E7%BA%B2%E9%A2%84%E8%A7%88+%E8%8A%82%E7%82%B9%E6%B8%85%E6%99%B0%E5%8F%AF%E8%A7%81+%E7%A1%AE%E4%BF%9D%E6%BC%94%E7%A4%BA%E9%80%BB%E8%BE%91%E4%B8%A5%E4%B8%9D%E5%90%88%E7%BC%9D.png) | ![扩写](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/02-%E7%94%9F%E6%88%90%E6%8F%8F%E8%BF%B0-AI%E5%86%85%E5%AE%B9%E6%89%B9%E9%87%8F%E6%89%A9%E5%86%99+%E6%B7%B1%E5%BA%A6%E8%AF%AD%E5%A2%83%E6%B6%A6%E8%89%B2+%E5%8A%A9%E6%82%A8%E6%89%93%E9%80%A0%E4%B8%93%E4%B8%9A%E7%BA%A7%E6%BC%94%E8%AE%B2%E6%96%87%E7%A8%BF.gif) |

| | | |
|:---:|:---:|:---:|
| ![导入](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/03-%E5%AF%BC%E5%85%A5%E4%BB%BB%E5%8A%A1-%E4%BB%BB%E5%8A%A1%E4%B8%80%E9%94%AE%E6%89%B9%E9%87%8F%E5%AF%BC%E5%85%A5+%E6%9E%81%E7%AE%80%E5%90%AF%E5%8A%A8%E6%B5%81%E7%A8%8B+%E8%AE%A9%E6%82%A8%E7%9A%84%E6%83%B3%E6%B3%95%E7%9E%AC%E9%97%B4%E8%BD%AC%E5%8C%96%E4%B8%BA%E7%94%9F%E4%BA%A7%E5%8A%9B.gif) | ![批量](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/05-%E6%89%B9%E9%87%8F%E7%94%9F%E6%88%90-%E5%8D%95%E9%A1%B5%E6%89%B9%E9%87%8F%E7%94%9F%E6%88%90%E5%88%87%E6%8D%A2+%E6%8C%89%E9%9C%80%E5%AE%9A%E5%88%B6%E7%94%9F%E4%BA%A7+%E4%B8%BA%E6%82%A8%E8%8A%82%E7%9C%81%E6%AF%8F%E4%B8%80%E7%A7%92%E5%88%9B%E4%BD%9C%E6%97%B6%E9%97%B4.gif) | ![回滚](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/06-%E5%8E%86%E5%8F%B2%E5%9B%9E%E6%BB%9A-%E7%89%88%E6%9C%AC%E6%97%B6%E5%85%89%E5%9B%9E%E6%BA%AF+%E8%87%AA%E7%94%B1%E6%92%A4%E9%94%80%E4%B8%8E%E6%81%A2%E5%A4%8D+%E7%BB%99%E6%82%A8%E7%9A%84%E5%88%9B%E4%BD%9C%E4%B9%B0%E4%B8%80%E4%BB%BD%E5%90%8E%E6%82%94%E8%8D%AF.gif) |

| | |
|:---:|:---:|
| ![图片包](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/11-%E5%9B%BE%E7%89%87%E5%8C%85%E5%AF%BC%E5%87%BA-%E8%B6%85%E9%AB%98%E6%B8%85%E5%9B%BE%E7%89%87%E5%8C%85%E5%AF%BC%E5%87%BA+%E5%BF%AB%E9%80%9F%E5%88%86%E4%BA%AB%E4%B8%8E%E5%88%86%E5%8F%91+%E9%80%82%E9%85%8D%E4%BB%BB%E4%BD%95%E7%A4%BE%E4%BA%A4%E5%AA%92%E4%BD%93%E7%BB%88%E7%AB%AF.gif) | ![PPTX](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/13-PPT%E5%AF%BC%E5%87%BA-PowerPoint%E5%8E%9F%E7%94%9F%E5%AF%BC%E5%87%BA%E4%BD%93%E9%AA%8C+%E6%94%AF%E6%8C%81%E4%BA%8C%E6%AC%A1%E7%BC%96%E8%BE%91+%E7%A1%AE%E4%BF%9D%E6%BC%94%E7%A4%BA%E4%B8%87%E6%97%A0%E4%B8%80%E5%A4%B1.gif) |

### 设计资产智库

模版广场、AI 视觉风格提取、规则注入、个人风格入库。

![模版](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/03-%E8%AE%BE%E8%AE%A1%E8%B5%84%E4%BA%A7%E6%99%BA%E5%BA%93/01-%E7%81%B5%E6%84%9F%E9%80%89%E6%8B%A9-%E7%B2%BE%E5%93%81%E6%A8%A1%E7%89%88%E5%B9%BF%E5%9C%BA+%E5%A4%9A%E9%A3%8E%E6%A0%BC%E4%B8%80%E9%94%AE%E5%BC%95%E7%94%A8+%E4%B8%BA%E6%82%A8%E6%8F%90%E4%BE%9B%E5%8F%96%E4%B9%8B%E4%B8%8D%E5%B0%BD%E7%9A%84%E8%AE%BE%E8%AE%A1%E7%81%B5%E6%84%9F.png)

| | |
|:---:|:---:|
| ![风格](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/03-%E8%AE%BE%E8%AE%A1%E8%B5%84%E4%BA%A7%E6%99%BA%E5%BA%93/02-%E8%A7%84%E8%8C%83%E7%94%9F%E6%88%90-%E8%AE%BE%E8%AE%A1%E6%96%B9%E6%A1%88AI%E7%A7%92%E7%BA%A7%E4%BA%A7%E5%87%BA+%E5%85%A8%E5%A5%97%E8%A7%86%E8%A7%89%E5%AE%9A%E4%B9%89+%E5%B0%8F%E7%99%BD%E4%B9%9F%E8%83%BD%E6%8B%A5%E6%9C%89%E4%B8%93%E4%B8%9A%E7%BA%A7%E8%AE%BE%E8%AE%A1%E6%B0%B4%E5%87%86.gif) | ![规则](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/03-%E8%AE%BE%E8%AE%A1%E8%B5%84%E4%BA%A7%E6%99%BA%E5%BA%93/04-%E8%A7%84%E5%88%99%E6%B3%A8%E5%85%A5-%E6%A0%B7%E5%BC%8F%E8%A7%84%E5%88%99%E4%B8%80%E9%94%AE%E6%B3%A8%E5%85%A5+%E8%A7%86%E8%A7%89%E8%A7%84%E8%8C%83%E5%90%8C%E4%BC%A0+%E7%A1%AE%E4%BF%9D%E5%A4%9A%E9%A1%B9%E7%9B%AE%E9%97%B4%E5%93%81%E8%B4%A8%E7%9A%84%E4%B8%80%E8%87%B4%E6%80%A7.gif) |

### AI 模型路由

配置并热切换 7+ AI 提供商，按任务类型自动路由。

![路由](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/04-%E6%99%BA%E7%AE%97%E7%AE%A1%E7%90%86%E5%BA%95%E5%BA%A7/01-%E5%BC%95%E6%93%8E%E9%85%8D%E7%BD%AE-%E5%85%A8%E5%8D%8F%E8%AE%AEAI%E6%A8%A1%E5%9E%8B%E9%85%8D%E7%BD%AE+%E6%A8%A1%E5%9E%8B%E8%87%AA%E7%94%B1%E8%87%AA%E7%94%B1%E5%88%87%E6%8D%A2+%E5%8A%A9%E6%82%A8%E6%95%B4%E5%90%88%E5%85%A8%E7%90%83%E6%9C%80%E9%A1%B6%E5%B0%96%E6%99%BA%E5%8A%9B%E8%B5%84%E6%BA%90.gif)

### 系统管理后台

业务看板、订单管理、RBAC 权限、积分、AI 引擎配置和系统设置。

![控制台](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/05-%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0/01-%E6%8E%A7%E5%88%B6%E5%8F%B0.png)

| | |
|:---:|:---:|
| ![订单](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/05-%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0/03-%E8%AE%A2%E5%8D%95%E7%AE%A1%E7%90%86.png) | ![权限](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/05-%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0/05-%E8%A7%92%E8%89%B2%E6%9D%83%E9%99%90.png) |

### Agent 对话模式

自然语言驱动全流程 PPT 生成，说出来就行。

![欢迎页](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/06-Agent%E6%A8%A1%E5%BC%8F/%E6%96%B0%E5%BB%BA%E5%AF%B9%E8%AF%9D%E5%BC%95%E5%AF%BC%E7%A4%BA%E4%BE%8B.png)

| | |
|:---:|:---:|
| ![生成结果](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/06-Agent%E6%A8%A1%E5%BC%8F/%E7%94%9F%E6%88%90%E7%BB%93%E6%9E%9C%E9%A2%84%E8%A7%88.png) | ![二次修订](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/06-Agent%E6%A8%A1%E5%BC%8F/%E7%94%9F%E6%88%90%E7%BB%93%E6%9E%9C%E4%BA%8C%E6%AC%A1%E4%BF%AE%E8%AE%A2%E5%92%8C%E9%87%8D%E6%96%B0%E7%94%9F%E6%88%90.png) |

---

## 双模式

| | 个人模式 | 企业模式 |
|---|---|---|
| **目标** | AI 创作 PPT，自我使用 | 商业化 SaaS 运营，对外服务 |
| **必填配置** | 5 项（AI Key + JWT + DB） | 全部配置 + 商户密钥 + SSL |
| **功能范围** | 大纲 → 内容 → 配图 → 导出 | 全功能 + 管理后台 + 支付 + VIP |
| **可忽略模块** | 管理面板、支付、VIP、积分 | 无 |

### 最小配置（个人模式，5 项）

```env
PORT=1111
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-at-least-32-characters"
AI_PROVIDER="Gemini"                                      # 可选: OpenAI, Volcengine, Zhipu, SiliconFlow 等
GEMINI_API_KEY="your-api-key"
```

---

## 快速开始

### 环境要求

- **Node.js** v18+（推荐 v22+）
- 一个 AI 提供商的 API Key（如 [Gemini](https://aistudio.google.com/)）

<details>
<summary><strong>企业级数据库（可选）</strong></summary>

默认使用 SQLite，无需额外安装。生产环境 / 多用户部署建议切换至：

| 数据库 | 适用场景 | DATABASE_URL 示例 |
|---|---|---|
| **PostgreSQL** | 生产环境、高并发 | `postgresql://user:pass@localhost:5432/yhai_ppt` |
| **MySQL** | 已有基础设施 | `mysql://user:pass@localhost:3306/yhai_ppt` |
| **SQLite**（默认） | 个人 / 开发 | `file:./dev.db` |

切换方式：修改 `server/prisma/schema.prisma` 中的 `provider` 从 `"sqlite"` 改为 `"postgresql"` 或 `"mysql"`，更新 `DATABASE_URL`，然后执行 `npx prisma db push`。

</details>

### 安装与启动

```bash
# 1. 安装依赖
npm install && cd server && npm install

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，填写 AI_PROVIDER 和对应的 API Key

# 3. 初始化数据库
cd server && npx prisma db push

# 4. 启动开发服务
# 方式一：Windows 一键启动
一键启动.bat
# 方式二：分别启动
npm run dev              # 前端 → localhost:1000
cd server && npm run dev # 后端  → localhost:1111
```

默认管理员账号：`admin@local` / `admin12345678`（生产环境请务必修改）。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| **前端** | React 19.2 · Vite 6.2 · Tailwind CSS 4.1 · TanStack Query 5.9 · Framer Motion 12 · WebSocket |
| **后端** | Express 5.2 · Prisma 6.19 · SQLite / PostgreSQL / MySQL · Winston · Zod 4.3 |
| **AI** | Google GenAI SDK · MinerU · OpenAI Function Calling · SSE 流式推送 |
| **商业化** | 支付宝 SDK · 微信支付 v3 · Nodemailer · express-rate-limit · JWT |
| **测试** | Vitest · Playwright · Bun Test |

---

## 架构

```mermaid
graph TD
    UI[React 前端] --> API[Express API 服务]
    API --> Router{多模型路由层}
    Router -- 推理/逻辑 --> Text[各大厂商文本模型]
    Router -- 审美/生图 --> Image[各大厂商图片模型]
    Router -- 视觉分析 --> Vision[各大厂商视觉模型]
    API --> Agent[Agent 对话服务]
    Agent -->|Function Calling| Tools[9 大 AI 工具]
    UI <-->|SSE + WebSocket| Agent
```

---

## 路线图

- [ ] 原生可编辑 PPTX 导出（保留文本层和矢量图形）
- [ ] 智能排版引擎（自动图文对齐）
- [ ] PowerPoint 动画导出
- [ ] 多人实时协作
- [x] Agent 对话式生成模式
- [x] 商业化基础设施（支付、积分、VIP、退款）
- [x] 企业级 RBAC 权限与审计日志
- [x] 增长运营工具（邀请返利、签到、CRM）

---

## 许可证

[GNU AGPL-3.0-or-later](./LICENSE)

*YH-AI PPT: 让每一场演示都能直抵人心。*
