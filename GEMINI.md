# 🍌 BananaSlides-GenAI 项目核心手册 (Core Manual)

> **最后更新时间**: 2026-01-27
> **版本**: v2.0 (全维度深潜版)
> **核心原则**: 全局遵守 **中文原生协议 v5.0**

---

## 1. 🇨🇳 首要原则 (Prime Directives)

> **⚠️ 必须强制遵守，这是 AI 协作的基石：**

*   **全链路中文输出**：所有思考过程、代码注释、Git 提交信息（`<type>: <emoji> <summary>`）、计划与验证文档**必须**使用中文。
*   **术语冲突处理**：除特定的 API 参数名、变量名、数据库字段外，所有业务逻辑描述严禁混入英文。
*   **安全防御**：严禁在未经过 `PointsService` 校验的情况下触发任何 AI 生成动作。

---

## 2. 🏛️ 系统深度架构 (Deep Architecture)

### A. 全栈技术栈 (Engineering Stack)
*   **前端**: 
    *   `React 19 (Native Contexts)` + `Vite 6` + `TailwindCSS 4`.
    *   **状态管理**: `TanStack Query (React Query) v5` 用于服务端状态缓存，`React Context` 用于认证与基础 UI 状态。
    *   **动效渲染**: `Framer Motion` + `Lucide React` (图标库)。
*   **后端**: 
    *   `Node.js 22` + `Express 5 (Beta Range)`.
    *   **ORM**: `Prisma v6` + `SQLite` (单文件存储，极致便携)。
*   **AI 内核**: 
    *   **文本/逻辑**: `Google Gemini 1.5 Pro` / `DeepSeek V3`.
    *   **图像生成**: `Gemini 1.5 Pro-Image` / `FLUX.1` / `Doubao-Image`.
    *   **视觉解构**: `Gemini 1.5 Flash`.
    *   **文档解析**: `MinerU v4` (工业级 PDF/Word 结构化识别)。

### B. 混合 AI 路由协议 (Hybrid Routing)
系统通过 `getTaskConfig` (位于 `server/src/services/ai.service.ts`) 实现动态模型切换：
*   **Gemini Native**: 利用 Google 原生 SDK，支持端到端多模态流。
*   **OpenAI Adapter**: 兼容所有支持 `/v1/chat/completions` 及 `/v1/images/generations` 的供应商。
*   **特权指令**: 系统会自动为 **火山引擎 (Volcengine)** 等特定供应商注入分辨率补偿与 Seed 锁定参数。

---

## ⚡ 3. 核心业务系统解析 (Core Systems)

### A. 智能生产力流水线 (AI Pipeline) - `OutlineGenerator.tsx`
1.  **意图捕获 (Discovery)**: 支持“文本主题”与“文件上传”双重输入切换。
2.  **大纲生成 (Logic Phase)**: 
    *   AI 基于 `getPageTypeInstructions` 生成带有 `pageType` 标识的结构化 JSON。
    *   支持**单页重生成 (Regen)**，基于上下文增量更新。
    *   **草稿时光机**: 实时同步至 `localStorage`，支持中断恢复。
3.  **内容详制 (Detailing)**: 
    *   并发泵 (Concurrency Pump)：通过 `p-limit` 级思想控制 API 并发。
    *   **智能对齐**: 自动校验大纲与全局页数配置的一致性，执行“强制对齐”补齐逻辑。

### B. 精准积分计费体系 (Economic Engine) - `points.service.ts`
*   **原子化计费**: 每一步 AI 动作（润色、生图、解析、导出）均关联唯一的 `PointsActionCode`。
*   **两阶段提交 (Simulation)**: 
    1.  前端 `getActionCost` 触发预警。
    2.  后端 `deductPoints` 执行原子扣费。
*   **容错机制**: 提供 `FALLBACK_RULES` 确保在 API 规则库不可达时，业务不中断但逻辑降级为免费或固定成本模式。

### C. 视觉基因提取系统 (Vision Engine)
*   **参考图分析**: 利用 `Vision` 模型提取主色调、构图骨架与像素肌理。
*   **4层级 Prompt 合成**:
    1.  `L1` 视觉指纹：锁定色彩与纹理。
    2.  `L2` 业务语义：注入正文与总结金句。
    3.  `L3` 隔离指令：强制禁止生成 Prompt 字符。
    4.  `L4` 技术参数：16:9 4K 适配。

---

## 4. 👑 后台管理与监控 (Admin & Ops)

### A. 360° 系统观测 - `SystemStats.tsx`
*   **实时指标**: 总用户数、当日订单、全站项目完成率 (Completion Rate)。
*   **维度分析**: 通过 `Recharts` 绘制 7 天增长趋势与用户状态分布饼图。
*   **性能看板**: 实时监测 AI 生成次数与 API 成功率。

### B. RBAC 权限控制逻辑
*   **角色层级**: `USER` -> `PROFESSIONAL` -> `ADMIN` -> `SUPER_ADMIN`。
*   **权限绑定**: `role_permissions` 映射表。管理员可在后台热更新角色权限，无需重启服务。

---

## 🛠️ 5. 开发与部署规范 (Ops & Dev)

### A. 自动化维护脚本 (`/scripts`)
*   **启动流**: `一键启动.bat` -> 备份 DB -> 清理 Node 进程 -> 并发拉起前后端。
*   **数据库迁移**: 严禁直接执行 `prisma migrate`，必须使用带有备份保护的 `初始化数据库.bat`。

### B. 性能优化极值 (Performance Benchmarks)
*   **并发限制**: 
    *   文本生成建议: 10（取决于模型 QPM）。
    *   图片生成建议: 2（取决于 GPU/云端并发上限）。
*   **存储策略**: 
    *   生成的 Base64 图片在 `ProjectService` 访问时自动执行 **Lazy Upload** 迁移至 `/uploads/` 目录。

---

## 📚 6. 开发者必读 (Documentation Library)

*   **数据结构**: `docs/specs/数据架构设计书.md`
*   **算法逻辑**: `docs/specs/图片生成规范书.md` (关键：内容隔离算法)
*   **实战手册**: `docs/specs/PPT生成全流程应用手册.md`

---
*BananaSlides: 让每一场演示都能直抵人心。*
