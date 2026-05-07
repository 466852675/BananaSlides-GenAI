**[English](./README.md) | [中文](./README.zh-CN.md)**

# YH-AI PPT - AI-Powered Presentation Design Platform

> Multi-model AI engine with intelligent routing — from a single sentence to a polished presentation in minutes.

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/) [![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](#) [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?logo=tailwind-css)](#) [![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)](#) [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](./LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/466852675/YH-AI-PPT?style=social)](https://github.com/466852675/YH-AI-PPT/stargazers) [![GitHub Forks](https://img.shields.io/github/forks/466852675/YH-AI-PPT?style=social)](https://github.com/466852675/YH-AI-PPT/forks) [![GitHub Issues](https://img.shields.io/github/issues/466852675/YH-AI-PPT)](https://github.com/466852675/YH-AI-PPT/issues) [![Release](https://img.shields.io/github/v/release/466852675/YH-AI-PPT)](https://github.com/466852675/YH-AI-PPT/releases)

---

## Highlights

- **AI Productivity Pipeline** — One-sentence topic → structured outline → content expansion → AI-generated slides → multi-format export (PDF / image pack / PPTX)
- **Multi-Model Router** — Adapter-based architecture supporting Gemini / OpenAI / Zhipu / DeepSeek / Volcengine / SiliconFlow / ModelScope / local Ollama. Auto-routes by task type (text / image / vision). Hot-swap without restart.
- **Agent Mode** — Natural language conversation drives the entire PPT creation workflow. 9 AI tools (Function Calling), guided/auto dual execution modes, SSE + WebSocket real-time progress.
- **Design Asset Library** — Template gallery, AI-powered visual style extraction from reference images, personal style vault. 4-layer Prompt synthesis engine for consistent visual quality.
- **MinerU Document Parsing** — Industrial-grade PDF/Word structural extraction for content ingestion.
- **SaaS-Ready Infrastructure** — Payment (Alipay/WeChat), credits, VIP membership, refund risk control, messaging center, RBAC with 6 user roles. Configure merchant keys to go live.

---

## Supported AI Providers

[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google)](#) [![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?logo=openai)](#) [![Zhipu](https://img.shields.io/badge/Zhipu-GLM-4E79A7)](#) [![DeepSeek](https://img.shields.io/badge/DeepSeek-V3-0088CC)](#) [![Volcengine](https://img.shields.io/badge/Volcengine-Doubao-3370FF?logo=bytedance)](#) [![SiliconFlow](https://img.shields.io/badge/SiliconFlow-FLUX-7C3AED)](#) [![ModelScope](https://img.shields.io/badge/ModelScope-Qwen-FF6A00)](#) [![Ollama](https://img.shields.io/badge/Ollama-Local-000000?logo=ollama)](#)

---

## Feature Tour

### Dashboard & Project Management

Card-based project kanban with real-time status tracking, priority pinning, quick-preview carousel, and archive management with asset reuse.

![Dashboard](./image/02-敏捷协作矩阵/01-系统概览-项目卡片式看板+多任务并行管理+为您呈现工业级的生产效率.gif)

| |
|:---:|
| ![Archive](./image/01-智能生产力链路/07-自动归档-项目自动归档入库+云端同步管理+让您的每一份努力都有迹可循.gif) |

### AI Productivity Pipeline

End-to-end automation: topic → outline → content → images → export (PDF / image pack / PPTX). Supports version rollback and asset reuse.

![Topic](./image/01-智能生产力链路/00-开启大纲-输入一句话描述+AI修饰生成主题+让您的PPT标题更有专业深度.gif)

| | |
|:---:|:---:|
| ![Outline](./image/01-智能生产力链路/01-开启大纲-结构化大纲预览+节点清晰可见+确保演示逻辑严丝合缝.png) | ![Content](./image/01-智能生产力链路/02-生成描述-AI内容批量扩写+深度语境润色+助您打造专业级演讲文稿.gif) |

| | | |
|:---:|:---:|:---:|
| ![Import](./image/01-智能生产力链路/03-导入任务-任务一键批量导入+极简启动流程+让您的想法瞬间转化为生产力.gif) | ![Batch](./image/01-智能生产力链路/05-批量生成-单页批量生成切换+按需定制生产+为您节省每一秒创作时间.gif) | ![History](./image/01-智能生产力链路/06-历史回滚-版本时光回溯+自由撤销与恢复+给您的创作买一份后悔药.gif) |

| | |
|:---:|:---:|
| ![Images](./image/01-智能生产力链路/11-图片包导出-超高清图片包导出+快速分享与分发+适配任何社交媒体终端.gif) | ![PPTX](./image/01-智能生产力链路/13-PPT导出-PowerPoint原生导出体验+支持二次编辑+确保演示万无一失.gif) |

### Design Asset Library

Template gallery, AI-powered visual style extraction, rule injection, and personal style vault.

![Templates](./image/03-设计资产智库/01-灵感选择-精品模版广场+多风格一键引用+为您提供取之不尽的设计灵感.png)

| | |
|:---:|:---:|
| ![Style](./image/03-设计资产智库/02-规范生成-设计方案AI秒级产出+全套视觉定义+小白也能拥有专业级设计水准.gif) | ![Rules](./image/03-设计资产智库/04-规则注入-样式规则一键注入+视觉规范同传+确保多项目间品质的一致性.gif) |

### AI Model Router

Configure and hot-swap between 7+ AI providers. Auto-route by task type.

![Router](./image/04-智算管理底座/01-引擎配置-全协议AI模型配置+模型自由自由切换+助您整合全球最顶尖智力资源.gif)

### Admin Panel

Business dashboard, order management, RBAC permissions, credits, AI engine config, and system settings.

![Console](./image/05-系统管理后台/01-控制台.png)

| | |
|:---:|:---:|
| ![Orders](./image/05-系统管理后台/03-订单管理.png) | ![Roles](./image/05-系统管理后台/05-角色权限.png) |

### Agent Mode

Conversational AI drives the entire PPT creation workflow. Say it, and it's done.

![Welcome](./image/06-Agent模式/新建对话引导示例.png)

| | |
|:---:|:---:|
| ![Result](./image/06-Agent模式/生成结果预览.png) | ![Revise](./image/06-Agent模式/生成结果二次修订和重新生成.png) |

---

## Dual Mode

| | Personal | Enterprise |
|---|---|---|
| **Goal** | Create AI-powered presentations for personal use | Run a commercial SaaS platform |
| **Required config** | 5 items (AI Key + JWT + DB) | Full config + merchant keys + SSL |
| **Features** | Outline → content → images → export | All features + admin panel + payment + VIP |
| **Can skip** | Admin panel, payment, VIP, credits | Nothing |

### Minimal Setup (Personal, 5 items)

```env
PORT=1111
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-at-least-32-characters"
AI_PROVIDER="Gemini"                                      # or OpenAI, Volcengine, Zhipu, etc.
GEMINI_API_KEY="your-api-key"
```

---

## Quick Start

### Prerequisites

- **Node.js** v18+ (v22+ recommended)
- An AI provider API key (e.g. [Gemini](https://aistudio.google.com/))

<details>
<summary><strong>Enterprise Database (optional)</strong></summary>

SQLite is used by default and requires no setup. For production / multi-user deployments, switch to:

| Database | Recommended For | DATABASE_URL Example |
|---|---|---|
| **PostgreSQL** | Production, high concurrency | `postgresql://user:pass@localhost:5432/yhai_ppt` |
| **MySQL** | Existing infrastructure | `mysql://user:pass@localhost:3306/yhai_ppt` |
| **SQLite** (default) | Personal / development | `file:./dev.db` |

To switch: change `provider` in `server/prisma/schema.prisma` from `"sqlite"` to `"postgresql"` or `"mysql"`, update `DATABASE_URL`, then run `npx prisma db push`.

</details>

### Install & Run

```bash
# 1. Install dependencies
npm install && cd server && npm install

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env — fill in AI_PROVIDER and your API key

# 3. Initialize database
cd server && npx prisma db push

# 4. Start development servers
# Option A: Windows one-click
start_app.bat
# Option B: Separate terminals
npm run dev              # Frontend → localhost:1000
cd server && npm run dev # Backend  → localhost:1111
```

Default admin account: `admin@local` / `admin12345678` (change in production).

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19.2 · Vite 6.2 · Tailwind CSS 4.1 · TanStack Query 5.9 · Framer Motion 12 · WebSocket |
| **Backend** | Express 5.2 · Prisma 6.19 · SQLite / PostgreSQL / MySQL · Winston · Zod 4.3 |
| **AI** | Google GenAI SDK · MinerU · OpenAI Function Calling · SSE streaming |
| **Commerce** | Alipay SDK · WeChat Pay v3 · Nodemailer · express-rate-limit · JWT |
| **Testing** | Vitest · Playwright · Bun Test |

---

## Architecture

```mermaid
graph TD
    UI[React Frontend] --> API[Express API Server]
    API --> Router{Multi-Model Router}
    Router -- text/logic --> Text[Text Models]
    Router -- image gen --> Image[Image Models]
    Router -- vision --> Vision[Vision Models]
    API --> Agent[Agent Service]
    Agent -->|Function Calling| Tools[9 AI Tools]
    UI <-->|SSE + WebSocket| Agent
```

---

## Roadmap

- [ ] Native editable PPTX export (preserving text layers and vector graphics)
- [ ] Smart layout engine with automatic text-image alignment
- [ ] PowerPoint animation export
- [ ] Real-time multi-user collaboration
- [x] Agent conversational generation mode
- [x] Commercial SaaS infrastructure (payment, credits, VIP, refund)
- [x] Enterprise RBAC permissions and audit logging
- [x] Growth tools (invite rewards, check-in, CRM)

---

## Documentation

| Topic | File |
|---|---|
| Data Dictionary (28 models) | [docs/03_Database/01_完整数据字典.md](./docs/03_Database/01_完整数据字典.md) |
| Security Architecture | [docs/02_Architecture/04_安全架构设计.md](./docs/02_Architecture/04_安全架构设计.md) |
| Multi-Model Router | [docs/04_Modules/02_AI生成能力/多模型路由.md](./docs/04_Modules/02_AI生成能力/多模型路由.md) |
| Credits System | [docs/04_Modules/04_用户增值服务/积分系统.md](./docs/04_Modules/04_用户增值服务/积分系统.md) |
| API Reference | [docs/05_API/01_REST_API/核心接口文档.md](./docs/05_API/01_REST_API/核心接口文档.md) |
| Error Codes | [docs/05_API/03_错误码规范.md](./docs/05_API/03_错误码规范.md) |
| Deployment Guide | [docs/06_Guides/02_部署指南/生产环境部署.md](./docs/06_Guides/02_部署指南/生产环境部署.md) |
| Troubleshooting | [docs/06_Guides/03_运维指南/故障排查手册.md](./docs/06_Guides/03_运维指南/故障排查手册.md) |
| Test Plan | [docs/07_Testing/测试计划.md](./docs/07_Testing/测试计划.md) |
| Full Doc Index | [docs/00_Meta/文档阅读指南.md](./docs/00_Meta/文档阅读指南.md) |

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=466852675/YH-AI-PPT&type=Date)](https://star-history.com/#466852675/YH-AI-PPT&Date)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=466852675/YH-AI-PPT)](https://github.com/466852675/YH-AI-PPT/graphs/contributors)

---

## License

[GNU AGPL-3.0-or-later](./LICENSE)

If you use this project in a public SaaS product, please attribute **"Based on YH-AI PPT"** with a link to the original repository.

---

*YH-AI PPT: Let every presentation resonate.*
