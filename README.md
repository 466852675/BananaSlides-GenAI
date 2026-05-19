**[English](./README.md) | [中文](./README.zh-CN.md)**

# YH-AI 智能PPT创作平台

> Multi-model AI engine with intelligent routing — from a single sentence to a polished presentation in minutes.

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/) [![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](#) [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?logo=tailwind-css)](#) [![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)](#) [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](./LICENSE)

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

![Dashboard](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/02-%E6%95%8F%E6%8D%B7%E5%8D%8F%E4%BD%9C%E7%9F%A9%E9%98%B5/01-%E7%B3%BB%E7%BB%9F%E6%A6%82%E8%A7%88-%E9%A1%B9%E7%9B%AE%E5%8D%A1%E7%89%87%E5%BC%8F%E7%9C%8B%E6%9D%BF+%E5%A4%9A%E4%BB%BB%E5%8A%A1%E5%B9%B6%E8%A1%8C%E7%AE%A1%E7%90%86+%E4%B8%BA%E6%82%A8%E5%91%88%E7%8E%B0%E5%B7%A5%E4%B8%9A%E7%BA%A7%E7%9A%84%E7%94%9F%E4%BA%A7%E6%95%88%E7%8E%87.gif)

| |
|:---:|
| ![Archive](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/07-%E8%87%AA%E5%8A%A8%E5%BD%92%E6%A1%A3-%E9%A1%B9%E7%9B%AE%E8%87%AA%E5%8A%A8%E5%BD%92%E6%A1%A3%E5%85%A5%E5%BA%93+%E4%BA%91%E7%AB%AF%E5%90%8C%E6%AD%A5%E7%AE%A1%E7%90%86+%E8%AE%A9%E6%82%A8%E7%9A%84%E6%AF%8F%E4%B8%80%E4%BB%BD%E5%8A%AA%E5%8A%9B%E9%83%BD%E6%9C%89%E8%BF%B9%E5%8F%AF%E5%BE%AA.gif) |

### AI Productivity Pipeline

End-to-end automation: topic → outline → content → images → export (PDF / image pack / PPTX). Supports version rollback and asset reuse.

![Topic](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/00-%E5%BC%80%E5%90%AF%E5%A4%A7%E7%BA%B2-%E8%BE%93%E5%85%A5%E4%B8%80%E5%8F%A5%E8%AF%9D%E6%8F%8F%E8%BF%B0+AI%E4%BF%AE%E9%A5%B0%E7%94%9F%E6%88%90%E4%B8%BB%E9%A2%98+%E8%AE%A9%E6%82%A8%E7%9A%84PPT%E6%A0%87%E9%A2%98%E6%9B%B4%E6%9C%89%E4%B8%93%E4%B8%9A%E6%B7%B1%E5%BA%A6.gif)

| | |
|:---:|:---:|
| ![Outline](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/01-%E5%BC%80%E5%90%AF%E5%A4%A7%E7%BA%B2-%E7%BB%93%E6%9E%84%E5%8C%96%E5%A4%A7%E7%BA%B2%E9%A2%84%E8%A7%88+%E8%8A%82%E7%82%B9%E6%B8%85%E6%99%B0%E5%8F%AF%E8%A7%81+%E7%A1%AE%E4%BF%9D%E6%BC%94%E7%A4%BA%E9%80%BB%E8%BE%91%E4%B8%A5%E4%B8%9D%E5%90%88%E7%BC%9D.png) | ![Content](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/02-%E7%94%9F%E6%88%90%E6%8F%8F%E8%BF%B0-AI%E5%86%85%E5%AE%B9%E6%89%B9%E9%87%8F%E6%89%A9%E5%86%99+%E6%B7%B1%E5%BA%A6%E8%AF%AD%E5%A2%83%E6%B6%A6%E8%89%B2+%E5%8A%A9%E6%82%A8%E6%89%93%E9%80%A0%E4%B8%93%E4%B8%9A%E7%BA%A7%E6%BC%94%E8%AE%B2%E6%96%87%E7%A8%BF.gif) |

| | | |
|:---:|:---:|:---:|
| ![Import](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/03-%E5%AF%BC%E5%85%A5%E4%BB%BB%E5%8A%A1-%E4%BB%BB%E5%8A%A1%E4%B8%80%E9%94%AE%E6%89%B9%E9%87%8F%E5%AF%BC%E5%85%A5+%E6%9E%81%E7%AE%80%E5%90%AF%E5%8A%A8%E6%B5%81%E7%A8%8B+%E8%AE%A9%E6%82%A8%E7%9A%84%E6%83%B3%E6%B3%95%E7%9E%AC%E9%97%B4%E8%BD%AC%E5%8C%96%E4%B8%BA%E7%94%9F%E4%BA%A7%E5%8A%9B.gif) | ![Batch](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/05-%E6%89%B9%E9%87%8F%E7%94%9F%E6%88%90-%E5%8D%95%E9%A1%B5%E6%89%B9%E9%87%8F%E7%94%9F%E6%88%90%E5%88%87%E6%8D%A2+%E6%8C%89%E9%9C%80%E5%AE%9A%E5%88%B6%E7%94%9F%E4%BA%A7+%E4%B8%BA%E6%82%A8%E8%8A%82%E7%9C%81%E6%AF%8F%E4%B8%80%E7%A7%92%E5%88%9B%E4%BD%9C%E6%97%B6%E9%97%B4.gif) | ![History](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/06-%E5%8E%86%E5%8F%B2%E5%9B%9E%E6%BB%9A-%E7%89%88%E6%9C%AC%E6%97%B6%E5%85%89%E5%9B%9E%E6%BA%AF+%E8%87%AA%E7%94%B1%E6%92%A4%E9%94%80%E4%B8%8E%E6%81%A2%E5%A4%8D+%E7%BB%99%E6%82%A8%E7%9A%84%E5%88%9B%E4%BD%9C%E4%B9%B0%E4%B8%80%E4%BB%BD%E5%90%8E%E6%82%94%E8%8D%AF.gif) |

| | |
|:---:|:---:|
| ![Images](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/11-%E5%9B%BE%E7%89%87%E5%8C%85%E5%AF%BC%E5%87%BA-%E8%B6%85%E9%AB%98%E6%B8%85%E5%9B%BE%E7%89%87%E5%8C%85%E5%AF%BC%E5%87%BA+%E5%BF%AB%E9%80%9F%E5%88%86%E4%BA%AB%E4%B8%8E%E5%88%86%E5%8F%91+%E9%80%82%E9%85%8D%E4%BB%BB%E4%BD%95%E7%A4%BE%E4%BA%A4%E5%AA%92%E4%BD%93%E7%BB%88%E7%AB%AF.gif) | ![PPTX](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/01-%E6%99%BA%E8%83%BD%E7%94%9F%E4%BA%A7%E5%8A%9B%E9%93%BE%E8%B7%AF/13-PPT%E5%AF%BC%E5%87%BA-PowerPoint%E5%8E%9F%E7%94%9F%E5%AF%BC%E5%87%BA%E4%BD%93%E9%AA%8C+%E6%94%AF%E6%8C%81%E4%BA%8C%E6%AC%A1%E7%BC%96%E8%BE%91+%E7%A1%AE%E4%BF%9D%E6%BC%94%E7%A4%BA%E4%B8%87%E6%97%A0%E4%B8%80%E5%A4%B1.gif) |

### Design Asset Library

Template gallery, AI-powered visual style extraction, rule injection, and personal style vault.

![Templates](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/03-%E8%AE%BE%E8%AE%A1%E8%B5%84%E4%BA%A7%E6%99%BA%E5%BA%93/01-%E7%81%B5%E6%84%9F%E9%80%89%E6%8B%A9-%E7%B2%BE%E5%93%81%E6%A8%A1%E7%89%88%E5%B9%BF%E5%9C%BA+%E5%A4%9A%E9%A3%8E%E6%A0%BC%E4%B8%80%E9%94%AE%E5%BC%95%E7%94%A8+%E4%B8%BA%E6%82%A8%E6%8F%90%E4%BE%9B%E5%8F%96%E4%B9%8B%E4%B8%8D%E5%B0%BD%E7%9A%84%E8%AE%BE%E8%AE%A1%E7%81%B5%E6%84%9F.png)

| | |
|:---:|:---:|
| ![Style](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/03-%E8%AE%BE%E8%AE%A1%E8%B5%84%E4%BA%A7%E6%99%BA%E5%BA%93/02-%E8%A7%84%E8%8C%83%E7%94%9F%E6%88%90-%E8%AE%BE%E8%AE%A1%E6%96%B9%E6%A1%88AI%E7%A7%92%E7%BA%A7%E4%BA%A7%E5%87%BA+%E5%85%A8%E5%A5%97%E8%A7%86%E8%A7%89%E5%AE%9A%E4%B9%89+%E5%B0%8F%E7%99%BD%E4%B9%9F%E8%83%BD%E6%8B%A5%E6%9C%89%E4%B8%93%E4%B8%9A%E7%BA%A7%E8%AE%BE%E8%AE%A1%E6%B0%B4%E5%87%86.gif) | ![Rules](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/03-%E8%AE%BE%E8%AE%A1%E8%B5%84%E4%BA%A7%E6%99%BA%E5%BA%93/04-%E8%A7%84%E5%88%99%E6%B3%A8%E5%85%A5-%E6%A0%B7%E5%BC%8F%E8%A7%84%E5%88%99%E4%B8%80%E9%94%AE%E6%B3%A8%E5%85%A5+%E8%A7%86%E8%A7%89%E8%A7%84%E8%8C%83%E5%90%8C%E4%BC%A0+%E7%A1%AE%E4%BF%9D%E5%A4%9A%E9%A1%B9%E7%9B%AE%E9%97%B4%E5%93%81%E8%B4%A8%E7%9A%84%E4%B8%80%E8%87%B4%E6%80%A7.gif) |

### AI Model Router

Configure and hot-swap between 7+ AI providers. Auto-route by task type.

![Router](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/04-%E6%99%BA%E7%AE%97%E7%AE%A1%E7%90%86%E5%BA%95%E5%BA%A7/01-%E5%BC%95%E6%93%8E%E9%85%8D%E7%BD%AE-%E5%85%A8%E5%8D%8F%E8%AE%AEAI%E6%A8%A1%E5%9E%8B%E9%85%8D%E7%BD%AE+%E6%A8%A1%E5%9E%8B%E8%87%AA%E7%94%B1%E8%87%AA%E7%94%B1%E5%88%87%E6%8D%A2+%E5%8A%A9%E6%82%A8%E6%95%B4%E5%90%88%E5%85%A8%E7%90%83%E6%9C%80%E9%A1%B6%E5%B0%96%E6%99%BA%E5%8A%9B%E8%B5%84%E6%BA%90.gif)

### Admin Panel

Business dashboard, order management, RBAC permissions, credits, AI engine config, and system settings.

![Console](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/05-%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0/01-%E6%8E%A7%E5%88%B6%E5%8F%B0.png)

| | |
|:---:|:---:|
| ![Orders](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/05-%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0/03-%E8%AE%A2%E5%8D%95%E7%AE%A1%E7%90%86.png) | ![Roles](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/05-%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0/05-%E8%A7%92%E8%89%B2%E6%9D%83%E9%99%90.png) |

### Agent Mode

Conversational AI drives the entire PPT creation workflow. Say it, and it's done.

![Welcome](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/06-Agent%E6%A8%A1%E5%BC%8F/%E6%96%B0%E5%BB%BA%E5%AF%B9%E8%AF%9D%E5%BC%95%E5%AF%BC%E7%A4%BA%E4%BE%8B.png)

| | |
|:---:|:---:|
| ![Result](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/06-Agent%E6%A8%A1%E5%BC%8F/%E7%94%9F%E6%88%90%E7%BB%93%E6%9E%9C%E9%A2%84%E8%A7%88.png) | ![Revise](https://raw.githubusercontent.com/466852675/YH-AI-PPT/assets/image/06-Agent%E6%A8%A1%E5%BC%8F/%E7%94%9F%E6%88%90%E7%BB%93%E6%9E%9C%E4%BA%8C%E6%AC%A1%E4%BF%AE%E8%AE%A2%E5%92%8C%E9%87%8D%E6%96%B0%E7%94%9F%E6%88%90.png) |

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
一键启动.bat
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

## License

[GNU AGPL-3.0-or-later](./LICENSE)

*YH-AI 智能PPT创作平台*
