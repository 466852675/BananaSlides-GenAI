# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

YH-AI PPT 是一个 AI 驱动的智能演示文稿设计平台，支持多模型路由、商业化 SaaS 基础设施（支付、积分、会员、退款）。

**技术栈**: React 19.2 + Vite 6.2 + Tailwind CSS 4.1 (前端) | Express 5.2 + Prisma 6.19 + SQLite (后端)

## 常用命令

### 前端 (根目录)
```bash
npm run dev          # 启动开发服务器 (localhost:1000)
npm run build        # 生产构建
npm run preview      # 预览生产构建产物
npm test             # Vitest 单元测试 (watch 模式)
npm run test:run     # Vitest 单元测试 (单次运行)
npm run test:e2e     # Playwright E2E 端到端测试
```

### 后端 (server/ 目录)
```bash
cd server
npm run dev          # 启动 API 服务器 (localhost:1111)
npm run build        # 编译 TypeScript
npx prisma db push   # 同步数据库 schema (开发环境)
npx prisma migrate dev --name <name>  # 创建迁移 (生产环境)
npx prisma migrate deploy            # 应用迁移 (生产环境)
npx prisma studio    # 打开 Prisma DB GUI
npm run db:seed      # 数据库种子数据
```

### 快捷启动
```bash
start_app.bat        # Windows 一键启动前后端
```

### 运维脚本 (`scripts/` 目录)
```
启动应用.bat          # 同时启动前后端
停止服务.bat          # 终止 Node/Vite 进程
初始化数据库.bat      # Prisma push + seed
备份数据库.bat        # SQLite dump
强制重置数据库(慎用).bat  # 删除 dev.db 后重建
```
详见 `scripts/脚本使用说明.md`

### 测试配置
```bash
# 运行单个测试
npx vitest src/utils.test.ts              # Vitest 单文件
npx vitest -t "具体测试名称"               # Vitest 按名称
npx playwright test tests/e2e/sanity.spec.ts  # Playwright 单文件
npx playwright test -g "测试名称"          # Playwright 按名称
npx playwright test --headed              # 显示浏览器窗口

# 后端测试
cd server && bun test                    # 后端单元测试 (Bun)
cd server && bun test --watch            # 后端监听模式
cd server && bun test --coverage         # 后端覆盖率
```

测试配置要点:
- **Vitest**: 使用 `jsdom` 环境，匹配 `src/**/*.{test,spec}.{ts,tsx}`
- **Playwright**: `baseURL: 'http://localhost:1000'`，仅 Chromium，自动启动 dev server (120s 超时)，CI 重试 2 次
- **Bun**: 后端独立测试 (`server/src/__tests__/setup.ts`)，需 `node_modules/bun/bin/bun`

### PPT编译脚本 (AI实用化应用大赛)
```bash
cd AI实用化应用大赛/03-脚本代码
node compile.js      # 编译PPT，输出到 04-输出产物/
```

## 架构要点

### 双端独立架构
- **非 monorepo**: 前后端各有独立的 `package.json`
- **Vite Proxy**: `/api` → `http://127.0.0.1:1111`, `/uploads` → 同后端, `/ws` → WebSocket 代理
- **MinerU 代理**: `/mineru-proxy` → `https://mineru.net`, `/mineru-oss-proxy` → `https://mineru.oss-cn-shanghai.aliyuncs.com`
- **路径别名**: 前端 `@/*` → `./src/*`
- **SSE 支持**: Vite 代理配置了 SSE 长连接（禁用缓冲），用于 Agent 任务进度推送

### MinerU 文档解析代理
环境变量 `DOC_PARSER_PROVIDER`/`DOC_PARSER_KEY`/`DOC_PARSER_BASE` 控制 MinerU 文档解析服务。Vite 开发代理转发到 MinerU 的 Web 端和 OSS 端。

### Vite 开发服务器监控优化
`vite.config.ts` 配置了大量文件忽略规则，避免以下文件变化触发页面重载：
- AI工具配置和状态: `.claude/**`, `.omc/**`, `.opencode/**` 等
- 后端代码: `server/**` (前后端独立开发，互不干扰)
- 文档目录: `docs/**`, `AGENTS.md`, `CLAUDE.md`
- 大赛文件: `AI实用化应用大赛/**`
- 图片和静态资源: `*.png`, `*.jpg`, `*.svg` 等

这确保前端开发时只有真正相关的文件变化才会触发HMR。

### 速率限制系统
`server/src/middleware/rateLimitMiddleware.ts` 实现 7 层分级限速 (均为环境感知阈值):
- `generalLimiter`: 通用请求 (开发 10000/min, 生产 300/min)
- `adminLimiter`: 管理员请求 (开发 10000/min, 生产 1000/min)
- `aiLimiter`: AI 生成调用 (开发 500/min, 生产 30/min)
- `uploadLimiter`: 文件上传 (开发 500/min, 生产 50/min)
- `agentSessionLimiter` / `agentMessageLimiter` / `agentTaskLimiter`: Agent 各端点

**开发环境自动绕过**: `NODE_ENV !== 'production'` 或 `origin` 含 `localhost`/`127.0.0.1` 时跳过所有限流 (`skipLimiterForDev` in `app.ts`)。

### Token 自动刷新机制
前端 API 客户端 (`src/api/client.ts`) 内置 401 拦截 + 自动刷新流程:
1. 捕获 401 响应 → 尝试调用 `/api/auth/refresh`
2. 并发失败请求自动入队，刷新完成后批量重试
3. 刷新失败 → 派发 `window.dispatchEvent(new CustomEvent('auth:logout'))`

### 构建代码分割策略
`vite.config.ts` 配置了 12 个手动 vendor chunk:
```
react | react-dom | recharts | jspdf | pptxgenjs | html2canvas | jszip | framer-motion | lucide | mammoth
```
加上应用代码自身分块，优化首屏加载和长期缓存命中率。

### AI 模型路由系统
核心服务: `server/src/services/ai.service.ts`

支持 6+ AI 提供商，自动协议检测:
- Gemini → 使用 `@google/genai` Native SDK
- OpenAI-compatible endpoints → 使用 axios
- 其他: Volcengine, Zhipu, SiliconFlow, ModelScope, CustomCombo

协议选择逻辑:
```typescript
// googleapis.com → Gemini Native SDK
// /v1 或 /v3 路径 → OpenAI-compatible (axios)
// model 包含 'gemini' → Gemini Native
```

配置解析流程:
1. 检查数据库 `AiRule` 表获取活跃规则
2. 解析 `text`/`image`/`vision` 任务特定模型
3. 如 provider 为 `CustomCombo` 应用组合配置
4. 回退到环境变量设置
5. 结果缓存 1 分钟

### 后端分层架构
```
Controller → Service → Prisma (绝不在 Controller 中直接调用 Prisma)
```

### 数据库
- SQLite 文件: `server/prisma/dev.db`
- 所有事务使用 `prisma.$transaction()`
- Prisma Client 单例模式: `server/src/db.ts`

### Bootstrap 启动引导
服务器启动时 (`server/src/bootstrap/admin.bootstrap.ts`) 自动执行三阶段初始化:
1. **管理员账号**: 使用 `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_USERNAME`/`BOOTSTRAP_ADMIN_PASSWORD` 环境变量创建
2. **权限种子**: 12 条默认权限记录
3. **积分规则**: 5 条默认积分规则
4. **接管模式**: `BOOTSTRAP_ADMIN_TAKE_OVER=1` 可接管孤立数据

### 自定义 Cron 调度器
`server/src/jobs/cron.ts` 使用 `setTimeout` 实现（非 node-cron）:
- 每日凌晨 3:00 执行资源清理任务
- 支持任务状态追踪，避免重复执行

### 平滑关闭
`server/src/app.ts` 处理 `SIGTERM`/`SIGINT`/`uncaughtException`/`unhandledRejection`:
1. 停止接收新请求
2. 关闭 WebSocket 服务
3. 断开 Prisma 连接
4. 10 秒超时后强制退出

### 快照系统
`server/src/services/snapshot.service.ts` + `snapshot.routes.ts`:
- 基于项目的快照版本控制，支持创建/回滚/删除
- 与 Agent 对话深度绑定，每个对话节点可创建快照
- 前端通过 `src/api/agent.ts` 的 snapShot 相关 mutation 交互

### 回收站 (软删除)
`server/src/services/trash.service.ts` + `trash.routes.ts`:
- 项目/模板软删除，支持恢复和彻底清除
- 前端入口: `src/components/TrashPage.tsx`

### 消息与通知系统
**消息子系统**: `message.service.ts` + `message-archive.service.ts` + `message-template.service.ts`
**通知服务集群**: `ai-notification.service.ts` | `admin-notification.service.ts` | `vip-notification.service.ts` | `order-notification.service.ts` | `security-notification.service.ts`
**通知路由**: `notification.routes.ts` — 轮询新通知、标记已读

### WebSocket 实时通信
核心服务: `server/src/services/websocket.service.ts`

- **项目房间机制**: 基于 `projectId` 广播，支持多标签页/多设备同步
- **认证**: JWT 鉴权，连接时验证 token（URL 参数传递）
- **心跳检测**: 30s 间隔，60s 超时自动断开
- **消息类型**:
  - `connected` / `joined_project` / `left_project` - 连接管理
  - `agent_progress` / `agent_task_complete` / `agent_task_preview` - Agent 进度
  - `outline_streaming_chunk` / `content_streaming_chunk` - 流式输出
  - `image_progress` / `slides_update` - 图片生成进度
- **平滑关闭**: 服务关闭时主动通知所有客户端 (`code: 1001`)

### Agent 对话模式
核心服务: `server/src/services/agent.service.ts`

**双模式架构**：
- **工作台模式**: 手动配置 + 批量生成，精细控制每页
- **Agent 模式**: 自然语言驱动，AI 自动规划执行

**9 大 AI 工具** (OpenAI Function Calling 格式):
1. `generate_outline` - 根据主题生成结构化大纲
2. `expand_content` - 将大纲节点扩写为详细正文
3. `generate_image` - 为单页生成配图
4. `batch_generate_images` - 批量生成所有页面配图
5. `modify_slide` - 修改指定页面的内容或样式
6. `switch_style_template` - 切换项目的风格模板
7. `import_document` - 导入文档转为大纲
8. `export_project` - 导出项目为 PDF/PPTX/ZIP
9. `finalize_project` - 完成项目并归档

**双执行模式**:
- **引导确认模式** (默认): 每个关键任务生成预览，等待用户确认后执行
- **自动执行模式** (PROFESSIONAL+ 角色): AI 自动执行任务链，无需逐一确认

**实时进度推送**:
1. SSE 流式推送任务进度 (`/api/agent/:sessionId/stream`)
2. WebSocket 广播项目状态变更到同一项目的所有客户端
3. 乐观更新 UI，服务端响应后无缝替换
4. 消息支持编辑和"重置至此节点"，积分自动退还

**前端入口**: `src/components/AgentView.tsx`

### 积分与计费系统
核心服务: `server/src/services/points.service.ts`

- 标准用户支付 `rule.costPoints`
- VIP 用户支付 `rule.vipCostPoints`（通常折扣或免费）
- Admin 永久 VIP 身份

交易生命周期:
1. **Pending**: 扣除积分，`completedAt: null`
2. **Completed**: AI 生成成功，记录完成时间
3. **Refunded**: 失败时创建负金额交易退款

### 组件懒加载模式
大组件使用 `React.lazy()` + `Suspense` 实现代码分割:

```typescript
// 命名导出 → 默认导出转换
const Dashboard = lazy(() => 
  import('./components/Dashboard').then(m => ({ default: m.Dashboard }))
);

// Suspense 包裹
<Suspense fallback={<LazySectionFallback label="正在加载创作室" />}>
  <Dashboard ...props />
</Suspense>
```

已懒加载组件: Dashboard, AgentView, TrashPage, StyleTemplateManager, ProfileCenter, PointsHistory, AdminLayout, MessagesPage, HistoryPage

### Vite 构建代码分割策略
`vite.config.ts` 配置了 12 个手动 vendor chunk，优化首屏加载和长期缓存命中率：
- `vendor-react`, `vendor-react-dom` - React 核心
- `vendor-recharts` - 图表库
- `vendor-jspdf`, `vendor-pptxgenjs`, `vendor-html2canvas`, `vendor-jszip` - 导出功能
- `vendor-motion` - 动画 (Framer Motion)
- `vendor-lucide` - 图标库
- `vendor-mammoth` - 文档解析

## 关键文件

### 前端核心
| 功能 | 文件 |
|------|------|
| 主入口 | `src/App.tsx` (~4700行) |
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts` (含Token自动刷新机制) |
| 类型定义 | `src/types.ts` |
| Vite 配置 | `vite.config.ts` (代理、代码分割、忽略规则) |
| Gemini 前端服务 | `src/services/geminiService.ts` |
| 导出服务 | `src/services/exportService.ts` |
| Agent 前端组件 | `src/components/AgentView.tsx` |

### 后端核心
| 功能 | 文件 |
|------|------|
| 服务器入口 | `server/src/app.ts` (含平滑关闭处理) |
| 启动引导 | `server/src/bootstrap/admin.bootstrap.ts` (管理员/权限/积分初始化) |
| AI 模型路由 | `server/src/services/ai.service.ts` (支持6+提供商，1分钟缓存) |
| Agent 服务 | `server/src/services/agent.service.ts` (101KB，9大AI工具，双执行模式) |
| WebSocket 服务 | `server/src/services/websocket.service.ts` (项目房间广播，心跳检测) |
| 积分服务 | `server/src/services/points.service.ts` (VIP专属价格，交易生命周期) |
| 退款引擎 | `server/src/services/refund.service.ts` (核心，含edge-cases/exceptions/notifications子系统) |
| 数据库 Schema | `server/prisma/schema.prisma` |
| 快照服务 | `server/src/services/snapshot.service.ts` (版本时光机) |
| 回收站 | `server/src/services/trash.service.ts` (软删除) |
| 速率限制 | `server/src/middleware/rateLimitMiddleware.ts` (7层分级，开发环境自动绕过) |

### 其他重要文件
| 功能 | 文件 |
|------|------|
| 权限中间件 | `server/src/middlewares/requirePermission.ts` (RBAC检查) |
| 前端权限守卫 | `src/components/PermissionGuard.tsx` |
| 权限 Hook | `src/hooks/usePermissions.ts` |
| Cron 调度器 | `server/src/jobs/cron.ts` (setTimeout实现，非node-cron) |
| 文档解析代理 | `server/src/services/mineru.service.ts` (MinerU集成) |

## 代码规范

### TypeScript
- 后端严格模式 (`strict: true`)
- **禁止** `as any`, `@ts-ignore`, `@ts-expect-error`
- 函数参数和返回值需要显式类型

### React 组件
- 仅使用函数组件 + Hooks
- Props 接口定义在 `src/types.ts` 或组件内联
- 导入顺序: React → 库 → 组件 → Utils/Contexts

### 样式
- Tailwind CSS v4.1
- 动画使用 Framer Motion
- 图标使用 Lucide React

### 状态管理
- 本地状态: `useState`, `useReducer`
- 服务端状态: TanStack Query
- 认证: `AuthContext.tsx` (JWT)

## 关键反模式 (禁止)

### 数据操作
1. **禁止** 直接使用 `variants[0]` → 使用专用预览字段
2. **禁止** 存储 File 对象 → 立即通过 `asset.service.ts` 转换为 URL
3. **禁止** 在项目上下文中清空项目 ID (可能导致数据不一致)
4. **禁止** 使用通用 project mutation 更新幻灯片 → 必须使用 `syncSlidesMutation`

### 业务逻辑
5. **禁止** 空 catch 块 → 必须通过 Winston logger 记录错误
6. **禁止** 跳过 rate limiter → AI 调用前必须检查 `checkRateLimit()`
7. **禁止** 绕过 Zod 验证 → 所有 API 输入必须校验
8. **禁止** 在 Controller 中直接调用 Prisma → 遵循 Service → Controller → Prisma 分层

### 安全与合规
9. **禁止** 使用敏感词 → 内容过滤器 (`server/src/utils/content-filter.ts`) 检测后拒绝
10. **禁止** Prompt 注入攻击 → `server/src/utils/prompt-security.ts` 阻止系统提示覆盖
11. **禁止** 在 PPT 标题/列表中使用中文标点（。！？）→ 保持英文标点统一性

## 商业化系统

- **支付**: 支付宝/微信 (当前 Mock 模式，需配置密钥启用)
- **退款**: 完整实现 (风控、自动审批、权益回收)
- **积分**: VIP 专属价格支持
- **权限**: 7 级角色体系 (USER → SUPER_ADMIN)

### 支付状态说明
- **当前 Mock 模式**: 支付接口已完整实现，但默认模拟支付流程
- **启用真实支付**: 配置支付宝/微信商户密钥 + 关闭 Mock 模式
- **预计接入时间**: 2-3 天完成渠道对接

### 退款风控系统
完整实现的退款流程：
1. 用户申请 → 7 项风控规则自动检测
2. 低风险自动审批 / 高风险人工复核
3. 打款完成后自动回收权益（VIP 降级、积分扣除）

### RBAC 权限检查
后端中间件: `server/src/middlewares/requirePermission.ts`
前端组件: `src/components/PermissionGuard.tsx`

```typescript
// 后端权限检查
router.delete('/users/:id', requirePermission('admin.users.manage'), ...);

// 前端权限守卫
<PermissionGuard permission="admin.orders.refund">
  <Button>退款</Button>
</PermissionGuard>
```

前端 Hook: `src/hooks/usePermissions.ts` → `hasPermission(code)` 返回布尔值

## 项目目录结构

### 主要目录
```
YH-AI PPT/
├── src/                    # 前端源码 (React)
├── server/                 # 后端源码 (Express)
├── docs/                   # 项目文档 (按功能模块组织)
├── tests/                  # E2E测试 (Playwright)
├── scripts/                # 运维脚本
├── image/                  # 系统截图 (README引用)
├── AI实用化应用大赛/       # 大赛资料 (已整理分类)
└── 系统截图/               # 本地截图资源
```

### AI实用化应用大赛目录结构
```
AI实用化应用大赛/
├── 01-比赛资料/            # 活动方案、报名表
├── 02-设计文档/            # PPT设计方案
├── 03-脚本代码/            # PPT生成脚本 (compile.js + slide-XX.js)
├── 04-输出产物/            # 生成的PPT文件
└── 05-资源素材/            # 预留素材目录
```

### docs文档目录结构
```
docs/
├── 00_Meta/                # 元文档 (阅读指南、术语表)
├── 01_Requirements/        # 需求文档
├── 02_Architecture/        # 架构设计
├── 03_Database/            # 数据库设计
├── 04_Modules/             # 功能模块文档 (按模块细分)
├── 05_API/                 # API文档
├── 06_Guides/              # 开发/部署/运维指南
└── 07_Testing/             # 测试文档
```

详细文档见 `AGENTS.md` 和 `docs/` 目录。
