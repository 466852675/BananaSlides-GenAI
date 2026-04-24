# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

YH-AI PPT（内部代号 BananaSlides）是 AI 驱动的智能演示文稿设计平台，支持多模型路由、Agent 对话模式、商业化 SaaS 基础设施（支付、积分、会员、退款）。

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
npm run build        # 编译 TypeScript → dist/
npm start            # 运行编译产物 node dist/app.js
npx prisma db push   # 同步数据库 schema (开发环境)
npx prisma migrate dev --name <name>  # 创建迁移 (生产环境)
npx prisma migrate deploy            # 应用迁移 (生产环境)
npx prisma studio    # 打开 Prisma DB GUI
npm run db:seed      # 数据库种子数据
npm test             # Bun 单元测试
npm test:watch       # Bun 监听模式
npm test:coverage    # Bun 覆盖率
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

### 运行单个测试
```bash
npx vitest src/utils.test.ts              # Vitest 单文件
npx vitest -t "具体测试名称"               # Vitest 按名称
npx playwright test tests/e2e/sanity.spec.ts  # Playwright 单文件
npx playwright test -g "测试名称"          # Playwright 按名称
npx playwright test --headed              # 显示浏览器窗口
cd server && bun test                     # 后端 Bun 测试
cd server && bun test --watch             # 后端监听模式
```

测试配置要点:
- **Vitest**: `jsdom` 环境，匹配 `src/**/*.{test,spec}.{ts,tsx}`
- **Playwright**: `baseURL: 'http://localhost:1000'`，仅 Chromium，自动启动 dev server (120s 超时)，CI 重试 2 次
- **Bun**: 后端独立测试 (`server/src/__tests__/setup.ts`)，需 `node_modules/bun/bin/bun`

### 提交前验证
```bash
npx vitest run              # 前端单元测试
npx playwright test         # E2E 测试
cd server && bun test       # 后端测试
```

### 测试账号 (开发环境)
管理员账号（由 Bootstrap 自动创建）：
- 邮箱: `admin@local`
- 用户名: `admin`
- 密码: `admin12345678`
- 角色: SUPER_ADMIN（永久 VIP）

**注意**: 始终使用此账号进行模拟用户测试验证。

### PPT编译脚本 (AI实用化应用大赛)
```bash
cd AI实用化应用大赛/03-脚本代码
node compile.js      # 编译PPT，输出到 04-输出产物/
```

## 架构要点

### 双端独立架构
- **非 monorepo**: 前后端各有独立的 `package.json` 和构建流程
- **Vite Proxy**: `/api` → `http://127.0.0.1:1111`, `/uploads` → 同后端, `/ws` → WebSocket 代理
- **MinerU 代理**: `/mineru-proxy` → `https://mineru.net`, `/mineru-oss-proxy` → MinerU OSS
- **路径别名**: 前端 `@/*` → `./src/*`
- **SSE 支持**: Vite 代理配置了 SSE 长连接（禁用缓冲），用于 Agent 任务进度推送

### 前端启动链
`src/index.tsx` 的 Provider 栈:
```
React.StrictMode > QueryClientProvider > AuthProvider > App
```

QueryClient 配置: `refetchOnWindowFocus: false`, `staleTime: 5min`, `refetchOnReconnect: true`

Token 存储 key: `bananaslides_token`

### 后端分层架构
```
Routes → Controllers → Services → Prisma ORM
```
**严格分层**: Controller 绝不直接调用 Prisma，必须通过 Service 层。

### 后端启动序列
`server/src/app.ts` 按顺序执行:
1. 加载 `.env` (dotenv)
2. 配置 CORS (`ALLOWED_ORIGINS`)
3. 应用 7 层分级限速
4. 挂载路由、静态文件
5. 启动 `.env` 热重载监听
6. 监听端口（默认 1111）
7. 同步设置到数据库
8. Bootstrap（管理员/权限/积分初始化）
9. 初始化 WebSocket
10. 启动定时任务（资源清理）

### .env 热重载
后端通过 `fs.watch` 监听 `.env` 变化，自动调用 `SettingService.reloadEnv()` — 修改配置无需重启服务。

### Bootstrap 启动引导
`server/src/bootstrap/admin.bootstrap.ts` 自动执行:
- 管理员账号（`BOOTSTRAP_ADMIN_EMAIL`/`USERNAME`/`PASSWORD` 环境变量）
- 12 条默认权限记录
- 5 条默认积分规则

### 平滑关闭
处理 `SIGTERM`/`SIGINT`/`uncaughtException`/`unhandledRejection`: 停止接收新请求 → 关闭 WebSocket → 断开 Prisma → 10s 超时强制退出。

### 速率限制系统
`server/src/middleware/rateLimitMiddleware.ts` 实现 7 层分级限速:
- `generalLimiter`: 通用请求（开发 10000/min, 生产 300/min）
- `aiLimiter`: AI 生成调用（开发 500/min, 生产 30/min）
- `adminLimiter`: 管理员请求
- `uploadLimiter`: 文件上传
- Agent 专用 limiter (session/message/task)

**开发环境自动绕过**: `NODE_ENV !== 'production'` 或 `origin` 含 `localhost`/`127.0.0.1` 时跳过所有限流。

### 中间件目录不一致 (已知问题)
后端存在两个中间件目录:
- `server/src/middleware/` (单数): `rateLimitMiddleware.ts`, `validateMiddleware.ts`
- `server/src/middlewares/` (复数): `auth.middleware.ts`, `requirePermission.ts`, `upload.ts`

新增中间件时注意放入正确目录。

### Token 自动刷新机制
前端 API 客户端 (`src/api/client.ts`) 内置 401 拦截 + 自动刷新流程:
1. 捏获 401 响应 → 尝试调用 `/api/auth/refresh`
2. 并发失败请求自动入队，刷新完成后批量重试
3. 刷新失败 → 派发 `window.dispatchEvent(new CustomEvent('auth:logout'))`

超时配置: 10 分钟 (适配 4K AI 图片生成)

### AI 模型路由系统
核心服务: `server/src/services/ai.service.ts` — 支持 6+ 提供商（Gemini 原生 SDK、OpenAI-compatible、Volcengine 等），配置缓存 1 分钟。

### WebSocket 实时通信
核心服务: `server/src/services/websocket.service.ts`
- **项目房间机制**: 基于 `projectId` 广播，支持多标签页/多设备同步
- **认证**: JWT 鉴权，连接时验证 token（URL 参数传递）
- **心跳检测**: 30s 间隔，60s 超时自动断开
- **平滑关闭**: 服务关闭时主动通知所有客户端 (`code: 1001`)

### Agent 对话模式
核心服务: `server/src/services/agent.service.ts` — 9 大 AI 工具、双执行模式（引导确认/自动执行）、SSE + WebSocket 实时推送。前端入口: `src/components/AgentView.tsx`。

### 积分与计费系统
核心服务: `server/src/services/points.service.ts`

交易生命周期: Pending (扣除积分) → Completed (记录完成时间) → Refunded (失败时负金额退款)

VIP 用户支付 `rule.vipCostPoints`（通常折扣或免费），Admin 永久 VIP 身份。

### 数据库
- SQLite 文件: `server/prisma/dev.db`
- Prisma Client 单例: `server/src/db.ts` — 使用 `globalThis.prisma` 防止热重载泄漏
- 所有事务使用 `prisma.$transaction()`

### 快照系统
`server/src/services/snapshot.service.ts` — 基于项目的版本控制，支持创建/回滚/删除，与 Agent 对话深度绑定。

### 回收站（软删除）
`server/src/services/trash.service.ts` — 项目/模板软删除，支持恢复和彻底清除。

### 构建代码分割策略
`vite.config.ts` 配置了 12 个手动 vendor chunk:
```
react | react-dom | recharts | jspdf | pptxgenjs | html2canvas | jszip | framer-motion | lucide | mammoth
```

### 组件懒加载模式
大组件使用 `lazy()` + `Suspense` 实现代码分割（定义在 `src/App.tsx` 顶部）:
Dashboard, HistoryPage, AgentView, TrashPage, StyleTemplateManager, ProfileCenter, PointsHistory, AdminLayout, MessagesPage

### Vite 开发服务器监控优化
`vite.config.ts` 配置了大量文件忽略规则（`.claude/**`, `.omc/**`, `server/**`, `docs/**`, `AGENTS.md`, `CLAUDE.md`, 静态资源等），确保只有前端相关文件变化触发 HMR。

## 关键文件

### 前端核心
| 功能 | 文件 |
|------|------|
| 主入口 | `src/App.tsx` (~4700行，包含路由和状态编排) |
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts` (含Token自动刷新) |
| API hooks | `src/api/` (16个模块，TanStack Query hooks) |
| 类型定义 | `src/types.ts` |
| Agent 前端组件 | `src/components/AgentView.tsx` |
| Gemini 前端服务 | `src/services/geminiService.ts` |
| 导出服务 | `src/services/exportService.ts` |
| WebSocket Hook | `src/hooks/useWebSocket.ts` |
| 权限 Hook | `src/hooks/usePermissions.ts` |
| 权限守卫组件 | `src/components/PermissionGuard.tsx` |

### 后端核心
| 功能 | 文件 |
|------|------|
| 服务器入口 | `server/src/app.ts` (启动序列 + 平滑关闭) |
| 启动引导 | `server/src/bootstrap/admin.bootstrap.ts` |
| AI 模型路由 | `server/src/services/ai.service.ts` (6+提供商，1分钟缓存) |
| Agent 服务 | `server/src/services/agent.service.ts` (101KB，9大AI工具) |
| WebSocket 服务 | `server/src/services/websocket.service.ts` |
| 积分服务 | `server/src/services/points.service.ts` |
| 退款引擎 | `server/src/services/refund.service.ts` (风控+权益回收) |
| 快照服务 | `server/src/services/snapshot.service.ts` |
| 回收站服务 | `server/src/services/trash.service.ts` |
| 数据库 Schema | `server/prisma/schema.prisma` (20+模型) |
| Zod 验证器 | `server/src/validators/index.ts` |
| 速率限制 | `server/src/middleware/rateLimitMiddleware.ts` |
| RBAC 中间件 | `server/src/middlewares/requirePermission.ts` |
| Cron 调度器 | `server/src/jobs/cron.ts` (setTimeout实现) |
| 内容过滤 | `server/src/utils/content-filter.ts` |
| Prompt 安全 | `server/src/utils/prompt-security.ts` |

## 代码规范

### TypeScript
- 后端严格模式 (`strict: true`)，前端宽松但避免 `any`
- **禁止** `as any`, `@ts-ignore`, `@ts-expect-error`
- 函数参数和返回值需要显式类型

### React 组件
- 仅使用函数组件 + Hooks，禁止类组件
- Props 接口定义在 `src/types.ts` 或组件内联
- 导入顺序: React → 库 → 组件 → Utils/Contexts
- 弹窗组件接受 `isOpen` + `onClose` props

### 样式
- Tailwind CSS v4.1 (通过 `@tailwindcss/vite` 插件)
- 动画使用 Framer Motion
- 图标使用 Lucide React: `import { IconName } from 'lucide-react'`
- 毛玻璃效果: `backdrop-blur-md bg-white/80`

### 错误处理
- **后端**: `try/catch` + Winston 日志，禁止空 catch 块
- **前端**: Error Boundaries + `react-hot-toast` 失败提示
- **API**: 结构化错误响应 + Zod 验证

### 状态管理
- 本地状态: `useState`, `useReducer`
- 服务端状态: TanStack Query
- 认证: `AuthContext.tsx` (JWT, `Authorization: Bearer <token>`)

### 命名约定
| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `Dashboard.tsx` |
| Hooks | camelCase + use 前缀 | `useAuth` |
| 变量 | camelCase | `isScrolled` |
| 常量 | UPPER_SNAKE_CASE | `STYLE_PRESETS` |
| 接口 | PascalCase | `ProjectSession` |
| 路径别名 | `@/*` → `./src/*` | |

## 关键反模式 (禁止)

1. **禁止** 直接使用 `variants[0]` → 使用专用预览字段
2. **禁止** 存储 File 对象 → 立即通过 `asset.service.ts` 转换为 URL
3. **禁止** 在项目上下文中清空项目 ID (可能导致数据不一致)
4. **禁止** 使用通用 project mutation 更新幻灯片 → 必须使用 `syncSlidesMutation`
5. **禁止** 空 catch 块 → 必须通过 Winston logger 记录错误
6. **禁止** 跳过 rate limiter → AI 调用前必须检查 `checkRateLimit()`
7. **禁止** 绕过 Zod 验证 → 所有 API 输入必须校验
8. **禁止** 在 Controller 中直接调用 Prisma → 遵循 Service → Controller → Prisma 分层
9. **禁止** 使用敏感词 → 内容过滤器检测后拒绝
10. **禁止** Prompt 注入攻击 → `prompt-security.ts` 阻止系统提示覆盖
11. **禁止** 在 PPT 标题/列表中使用中文标点（。！？）→ 保持英文标点统一性

## 商业化系统

- **支付**: 支付宝/微信 (当前 Mock 模式，需配置商户密钥启用)
- **退款**: 完整实现 (7项风控规则、自动审批、权益回收)
- **积分**: VIP 专属价格支持
- **权限**: 7 级角色体系 (USER → SUPER_ADMIN)

### RBAC 权限检查
```typescript
// 后端中间件
router.delete('/users/:id', requirePermission('admin.users.manage'), ...);

// 前端权限守卫
<PermissionGuard permission="admin.orders.refund">
  <Button>退款</Button>
</PermissionGuard>

// 前端 Hook
const { hasPermission } = usePermissions();
hasPermission('admin.orders.refund'); // → boolean
```

## 非标准偏差 (注意)

1. **Tailwind v4** 通过 Vite 插件引入（非 PostCSS 集成）
2. **两个独立 `package.json`**（非 monorepo workspaces）
3. **混合测试运行器**: Vitest + Playwright（前端），Bun（后端）
4. **Prisma 单例**通过 `globalThis.prisma` 防止热重载泄漏
5. **Cron 调度**使用 `setTimeout` 而非 node-cron
6. **`src/App.tsx`** 约 4700 行，包含所有路由和状态编排（单体组件）
7. **中间件目录不一致**: `middleware/`（单数）和 `middlewares/`（复数）两个目录并存
8. **.env 热重载**: 后端通过 `fs.watch` 监听 `.env`，修改配置无需重启

详细文档见 `AGENTS.md` 和 `docs/` 目录。