**[English](./README.md) | [中文](./README.zh-CN.md)**

# YH-AI PPT - 智能演示文稿全链条设计平台

> 多模型 AI 引擎智能路由 —— 一句话，从想法到演示，分钟级交付。

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/) [![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](#) [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?logo=tailwind-css)](#) [![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)](#) [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](./LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/466852675/YH-AI-PPT?style=social)](https://github.com/466852675/YH-AI-PPT/stargazers) [![GitHub Forks](https://img.shields.io/github/forks/466852675/YH-AI-PPT?style=social)](https://github.com/466852675/YH-AI-PPT/forks) [![GitHub Issues](https://img.shields.io/github/issues/466852675/YH-AI-PPT)](https://github.com/466852675/YH-AI-PPT/issues) [![Release](https://img.shields.io/github/v/release/466852675/YH-AI-PPT)](https://github.com/466852675/YH-AI-PPT/releases)

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

卡片式看板，支持实时状态追踪、优先级置顶和快速预览轮播。

![看板](./image/02-敏捷协作矩阵/01-系统概览-项目卡片式看板+多任务并行管理+为您呈现工业级的生产效率.gif)

| |
|:---:|
| ![状态](./image/02-敏捷协作矩阵/02-实时状态-动态任务实时播报+项目状态看板+帮您实时掌控全局生产进度.gif) |

### AI 生产力链路

端到端自动化：主题 → 大纲 → 内容 → 配图 → 导出（PDF / 图片包 / PPTX）。支持版本回滚和资产复用。

![主题](./image/01-智能生产力链路/00-开启大纲-输入一句话描述+AI修饰生成主题+让您的PPT标题更有专业深度.gif)

| | |
|:---:|:---:|
| ![大纲](./image/01-智能生产力链路/01-开启大纲-结构化大纲预览+节点清晰可见+确保演示逻辑严丝合缝.png) | ![扩写](./image/01-智能生产力链路/02-生成描述-AI内容批量扩写+深度语境润色+助您打造专业级演讲文稿.gif) |

| | | |
|:---:|:---:|:---:|
| ![导入](./image/01-智能生产力链路/03-导入任务-任务一键批量导入+极简启动流程+让您的想法瞬间转化为生产力.gif) | ![批量](./image/01-智能生产力链路/05-批量生成-单页批量生成切换+按需定制生产+为您节省每一秒创作时间.gif) | ![回滚](./image/01-智能生产力链路/06-历史回滚-版本时光回溯+自由撤销与恢复+给您的创作买一份后悔药.gif) |

| | |
|:---:|:---:|
| ![图片包](./image/01-智能生产力链路/11-图片包导出-超高清图片包导出+快速分享与分发+适配任何社交媒体终端.gif) | ![PPTX](./image/01-智能生产力链路/13-PPT导出-PowerPoint原生导出体验+支持二次编辑+确保演示万无一失.gif) |

### 设计资产智库

模版广场、AI 视觉风格提取、规则注入、个人风格入库。

![模版](./image/03-设计资产智库/01-灵感选择-精品模版广场+多风格一键引用+为您提供取之不尽的设计灵感.png)

| | |
|:---:|:---:|
| ![风格](./image/03-设计资产智库/02-规范生成-设计方案AI秒级产出+全套视觉定义+小白也能拥有专业级设计水准.gif) | ![规则](./image/03-设计资产智库/04-规则注入-样式规则一键注入+视觉规范同传+确保多项目间品质的一致性.gif) |

### AI 模型路由

配置并热切换 7+ AI 提供商，按任务类型自动路由。

![路由](./image/04-智算管理底座/01-引擎配置-全协议AI模型配置+模型自由自由切换+助您整合全球最顶尖智力资源.gif)

### 系统管理后台

业务看板、订单管理、RBAC 权限、积分、AI 引擎配置和系统设置。

![控制台](./image/05-系统管理后台/01-控制台.png)

| | |
|:---:|:---:|
| ![订单](./image/05-系统管理后台/03-订单管理.png) | ![权限](./image/05-系统管理后台/05-角色权限.png) |

### Agent 对话模式

自然语言驱动全流程 PPT 生成，说出来就行。

![欢迎页](./image/06-Agent模式/新建对话引导示例.png)

| | |
|:---:|:---:|
| ![生成结果](./image/06-Agent模式/生成结果预览.png) | ![二次修订](./image/06-Agent模式/生成结果二次修订和重新生成.png) |

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
start_app.bat
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

## 文档

| 主题 | 文件 |
|---|---|
| 数据字典（28 个模型） | [docs/03_Database/01_完整数据字典.md](./docs/03_Database/01_完整数据字典.md) |
| 安全架构设计 | [docs/02_Architecture/04_安全架构设计.md](./docs/02_Architecture/04_安全架构设计.md) |
| 多模型路由 | [docs/04_Modules/02_AI生成能力/多模型路由.md](./docs/04_Modules/02_AI生成能力/多模型路由.md) |
| 积分系统 | [docs/04_Modules/04_用户增值服务/积分系统.md](./docs/04_Modules/04_用户增值服务/积分系统.md) |
| API 接口文档 | [docs/05_API/01_REST_API/核心接口文档.md](./docs/05_API/01_REST_API/核心接口文档.md) |
| 错误码规范 | [docs/05_API/03_错误码规范.md](./docs/05_API/03_错误码规范.md) |
| 生产环境部署 | [docs/06_Guides/02_部署指南/生产环境部署.md](./docs/06_Guides/02_部署指南/生产环境部署.md) |
| 故障排查手册 | [docs/06_Guides/03_运维指南/故障排查手册.md](./docs/06_Guides/03_运维指南/故障排查手册.md) |
| 测试计划 | [docs/07_Testing/测试计划.md](./docs/07_Testing/测试计划.md) |
| 完整文档索引 | [docs/00_Meta/文档阅读指南.md](./docs/00_Meta/文档阅读指南.md) |

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=466852675/YH-AI-PPT&type=Date)](https://star-history.com/#466852675/YH-AI-PPT&Date)

## 贡献者

[![Contributors](https://contrib.rocks/image?repo=466852675/YH-AI-PPT)](https://github.com/466852675/YH-AI-PPT/graphs/contributors)

---

## 许可证

[GNU AGPL-3.0-or-later](./LICENSE)

在企业级 SaaS 产品中使用本项目，请在产品可见位置标注 **"Based on YH-AI PPT"** 并附原项目链接。

---

*YH-AI PPT: 让每一场演示都能直抵人心。*
