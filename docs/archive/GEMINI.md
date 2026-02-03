# 🍌 BananaSlides-GenAI 项目核心手册 (Core Manual)

> **最后更新时间**: 2026-01-28
> **版本**: v3.0 (全维度对齐版)
> **核心原则**: 全局遵守 **中文原生协议 v5.0**

---

## 1. 🇨🇳 首要原则 (Prime Directives)

> **⚠️ 必须强制遵守，这是 AI 协作的基石：**

*   **全链路中文输出**：所有思考过程、代码注释、Git 提交信息（`<type>: <emoji> <summary>`）、计划与验证文档**必须**使用中文。
*   **术语冲突处理**：除特定的 API 参数名、变量名、数据库字段外，所有业务逻辑描述严禁混入英文。
*   **安全防御**：严禁在未经过 `PointsService` 校验的情况下触发任何 AI 生成动作。

---

## 🏛️ 2. 系统深度架构 (Deep Architecture)

### A. 全栈技术栈 (Engineering Stack)
*   **前端**: 
    *   `React 19.2.3 (Native Contexts)` + `Vite 6.2.0` + `TailwindCSS 4.1.18`.
    *   **状态管理**: `TanStack Query (React Query) v5.9` 用于服务端状态缓存，`React Context` 用于认证与基础 UI 状态。
    *   **动效渲染**: `Framer Motion 12` + `Lucide React` (图标库)。
*   **后端**: 
    *   `Node.js 22.x/25.x` + `Express 5.2`.
    *   **ORM**: `Prisma v6.19` + `SQLite` (单文件存储，极致便携)。
*   **AI 内核**: 
    *   **文本/逻辑**: `Google Gemini 2.0/1.5 (Pro/Flash)` / `DeepSeek V3` / `Doubao-Pro`.
    *   **图像生成**: `Gemini 2.0 Pro-Image` / `FLUX.1` / `Doubao-Image (即梦)`.
    *   **视觉解构**: `Gemini 1.5 Flash` (路由别名: `gemini-3-flash`)。
    *   **文档解析**: `MinerU v4` (工业级 PDF/Word 结构化识别)。

### B. 混合 AI 路由协议 (Hybrid Routing)
系统通过 `getTaskConfig` (位于 `server/src/services/ai.service.ts`) 实现动态模型切换：
*   **Gemini Native**: 支持 Google 全系 SDK。内置 `gemini-3-*` 别名路由，自动平衡 **Gemini 2.0/1.5** 系列性能。
*   **OpenAI Adapter**: 兼容所有支持 `/v1/chat/completions` 及 `/v1/images/generations` 的供应商。
*   **火山引擎 (Volcengine) 优化**: 特别适配 Doubao/Ark 平台。支持 **推理接入点 ID**，内置 **分辨率自动补偿**（补齐 360w 像素阈值）与 **Seed 锁定**（风格一致性）。

---

## ⚡ 3. 核心业务系统解析 (Core Systems)

### A. 智能生产力流水线 (AI Pipeline) - `OutlineGenerator.tsx`
1.  **意图捕获 (Discovery)**: 支持“文本主题”与“文件上传”双重输入切换。
2.  **大纲生成 (Logic Phase)**: 
    *   AI 基于 `getPageTypeInstructions` 生成带有 `pageType` 标识的结构化 JSON。
    *   支持 **单页重生成 (Regen)**，基于上下文增量更新标题与简介。
    *   **草稿时光机**: 实时同步至 `localStorage`，支持 **Auth 状态锁定** (防止跨账号污染)。
3.  **内容详制 (Detailing)**: 
    *   **并行泵 (Concurrency Pump)**：通过 `.env` 中的 `PERF_TEXT_CONCURRENCY` 自定义 API 并发。
    *   **智能对齐**: 自动校验大纲与全局页数配置的一致性，执行 **“强制对齐”** (补齐/裁剪) 与 **“记忆寻回”** (从回收站恢复内容)。

### B. 精准积分计费体系 (Economic Engine) - `points.service.ts`
*   **原子化计费**: 每一步 AI 动作均关联唯一的 `PointsActionCode`。
    *   `outline_generation`: 建纲 | `outline_page_regen`: 单页重写
    *   `slide_content`: 内容详化 | `slide_image`: AI 生图
    *   `doc_parse`: 文档解析 | `smart_refine`: 文本润色
*   **两阶段提交 (Simulation)**: 前端执行成本预警，后端 `deductPoints` 进行原子扣费。
*   **审计日志**: 所有积分变动均记录流水，支持管理员手动调账备注。

### C. 视觉基因提取系统 (Vision Engine)
*   **参考图分析**: 利用 `Vision` 模型提取主色调、构图骨架与像素肌理。
*   **4层级 Prompt 合成**:
    1.  `L1` 视觉指纹：锁定色彩与纹理。
    2.  `L2` 业务语义：注入正文、**提炼金句 (One-liner)** 与排版指令。
    3.  `L3` 内容隔离：严格禁止渲染颜色代码、比例数字、字体名称及中文标点。
    4.  `L4` 技术参数：16:9 画幅、2K/4K 分辨率、火山引擎特定的 Seed 锁定。

---

## 👑 4. 后台管理与监控 (Admin & Ops)

### A. 360° 系统观测 - `OrderManagement.tsx` 等
*   **业务看板**: 实时监测订单流水、用户增长与积分消耗。
*   **审计增强**: 退款操作强制要求输入 **“退款理由”**，通过 `ConfirmDialog` 进行二次确认并计入日志。

### B. RBAC 权限控制逻辑
*   **角色层级**: `USER` -> `PROFESSIONAL` -> `ADMIN` -> `SUPER_ADMIN`。
*   **实时生效**: 权限变更即时同步至前端 Guard，无需重启服务。

---

## 🛠️ 5. 开发与部署规范 (Ops & Dev)

### A. 自动化维护脚本 (`/scripts`)
*   **启动流**: `启动应用.bat` -> 清理 Node 进程 -> 并发拉起前后端。
*   **环境初始化**: `初始化数据库.bat` 包含数据备份与 `npx prisma db push` 安全操作。

### B. 性能优化极值 (Performance Benchmarks)
*   **并发限制**: 
    *   文本生成: 建议 10 (由 `PERF_TEXT_CONCURRENCY` 控制)。
    *   图片生成: 建议 2 (由 `PERF_IMAGE_CONCURRENCY` 控制)。
*   **存储策略**: 
    *   生成的图片访问时执行 **Lazy Upload** 迁移。支持 `server/public/uploads` 本地持久化。

---

## 📚 6. 开发者必读 (Documentation Library)

*   **数据结构**: `docs/02_System_Design/数据架构设计书.md`
*   **算法逻辑**: `docs/03_Feature_Specs/图片生成规范书.md` (关键：内容隔离算法)
*   **实战手册**: `docs/04_Manuals/PPT生成全流程应用手册.md`
*   **技术全案**: `docs/01_Project_Overview/V8.0_技术全案.md`

---
*BananaSlides: 让每一场演示都能直抵人心。*
