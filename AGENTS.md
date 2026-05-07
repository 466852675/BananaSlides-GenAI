# AGENTS.md - YH-AI PPT 开发指南

**技术栈：** React 19.2 + Vite 6.2 + Express 5.2 + Prisma 6.19 + SQLite
**项目结构：** 两个独立包 — 根目录（前端）+ `server/`（后端）

## 命令

### 前端（根目录）
```bash
npm run dev          # 启动开发服务器 → localhost:1000
npm run build        # 生产环境构建
npm run preview      # 预览生产构建
npm test             # Vitest 单元测试（监听模式）
npm run test:run     # Vitest 运行一次
npm run test:e2e     # Playwright E2E 测试（baseURL: localhost:1000）
```

### 后端（server/）
```bash
cd server
npm run dev          # ts-node src/app.ts → localhost:1111
npm run build        # tsc 编译 → dist/
npm start            # node dist/app.js
npm test             # Bun 测试
npm run test:watch   # Bun 监听模式
npm run test:coverage# Bun 覆盖率
npm run db:seed      # 数据库种子数据
npx prisma db push   # 同步数据库结构（开发环境）
npx prisma migrate dev --name <名称>  # 创建数据库迁移
npx prisma migrate deploy            # 应用迁移（生产环境）
npx prisma studio    # 数据库 GUI
```

### 运维脚本（scripts/）
```bash
启动应用.bat          # 同时启动前后端
停止服务.bat          # 终止 Node/Vite 进程
初始化数据库.bat      # Prisma push + seed
备份数据库.bat        # SQLite dump
强制重置数据库(慎用).bat  # 删除 dev.db 后重建
```

### 快捷启动
```bash
start_app.bat        # Windows 一键启动前后端
```

### 运行单个测试
```bash
npx vitest src/utils.test.ts              # Vitest 单文件测试
npx vitest -t "具体测试名称"               # Vitest 按名称测试
npx playwright test tests/e2e/foo.spec.ts # Playwright 单文件测试
npx playwright test -g "测试名称"          # Playwright 按名称测试
npx playwright test --headed              # 显示浏览器窗口
cd server && bun test                     # 后端 Bun 测试
cd server && bun test --watch             # 后端监听模式
```

### 测试账号（开发环境）
管理员账号（由 Bootstrap 自动创建）：
- 邮箱: `admin@local`
- 用户名: `admin`
- 密码: `admin12345678`
- 角色: SUPER_ADMIN（永久 VIP）

### 提交前验证
```bash
# 前端
npx vitest run
npx playwright test
# 后端
cd server && npm test
# 始终对修改过的文件运行 lsp_diagnostics
```

## Vite 代理配置（重要）

代理定义在 `vite.config.ts`：
- `/api` → `http://127.0.0.1:1111`（后端 API，含 SSE 长连接）
- `/uploads` → 同后端（静态文件）
- `/ws` → WebSocket 升级代理
- `/mineru-proxy` → `https://mineru.net`（文档解析）
- `/mineru-oss-proxy` → `https://mineru.oss-cn-shanghai.aliyuncs.com`

Token 存储 key：`bananaslides_token`

## 代码风格

### TypeScript
- **后端**：严格模式（`"strict": true`）。禁止 `any`、`as any`、`@ts-ignore`。
- **前端**：宽松模式（`ES2022`、`DOM`、`DOM.Iterable`）。仍避免 `any`。
- 函数参数和返回值需显式声明类型。

### React 组件
- 仅使用函数式组件和 Hooks，禁止类组件。
- 文件名 PascalCase：`Dashboard.tsx`、`LoginModal.tsx`
- Props：在组件内联定义接口或放在 `src/types.ts`
- 导入顺序：React → 第三方库 → 组件 → 工具/上下文/API

### 样式
- Tailwind CSS v4.1（通过 `@tailwindcss/vite` 插件引入）
- Framer Motion 用于 AI 操作动画
- Lucide React 图标：`import { IconName } from 'lucide-react'`
- 毛玻璃效果：`backdrop-blur-md bg-white/80`

### 命名约定
| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `Dashboard.tsx` |
| Hooks | camelCase + use 前缀 | `useAuth` |
| 变量 | camelCase | `isScrolled` |
| 常量 | UPPER_SNAKE_CASE | `STYLE_PRESETS` |
| 接口 | PascalCase | `ProjectSession` |
| 路径别名 | `@/*` → `./src/*` | |

### 错误处理
- **后端**：`try/catch` + Winston 日志。禁止空 catch 块。
- **前端**：Error Boundaries + `react-hot-toast` 失败提示。
- **API**：结构化错误响应 + Zod 验证。
- **反模式**：禁止静默吞掉错误。

### 状态管理
- 本地状态：`useState`、`useReducer`
- 服务端状态：TanStack Query（`@tanstack/react-query`）
- 认证：`AuthContext.tsx`（JWT 通过 `Authorization: Bearer <token>`）
- 弹窗组件：接受 `isOpen` + `onClose` props

## 关键反模式（禁止）

1. **禁止**直接使用 `variants[0]` — 使用专用预览字段
2. **禁止**存储 File 对象 — 立即通过 `asset.service.ts` 转为 URL
3. **禁止**在 PPT 标题/列表中使用中文标点（。！？）
4. **禁止**在项目上下文中清空项目 ID
5. **始终**使用 `syncSlidesMutation` 更新幻灯片，而非通用项目 mutation
6. **禁止**绕过限流器 — AI 调用前检查 `checkRateLimit()`
7. **禁止**空 catch 块 — 始终通过 Winston 记录日志
8. **禁止**使用 `any` 类型 — 后端严格模式强制执行
9. **Service → Controller → Prisma** — 禁止在控制器中直接使用 Prisma
10. **始终**在提交前对修改过的文件运行 `lsp_diagnostics`

## 项目结构
```
YH-AI PPT/
├── src/                          # 前端（React）
│   ├── api/                      # API 客户端 + TanStack Query hooks（17 个模块）
│   │   ├── client.ts             # 含 Token 自动刷新
│   │   ├── agent.ts / auth.ts / projects.ts / ...
│   │   └── admin.ts / settings.ts / refund.ts / ...
│   ├── components/               # React 组件
│   │   ├── admin/                # 后台管理页面
│   │   ├── auth/                 # 登录注册
│   │   ├── dashboard/            # 仪表盘
│   │   ├── landing/              # 着陆页
│   │   ├── message/              # 消息通知组件
│   │   ├── outline/              # 大纲组件
│   │   ├── shared/               # 共享卡片
│   │   ├── ui/                   # UI 基础组件
│   │   ├── user/                 # 用户中心
│   │   └── workbench/            # 工作台
│   ├── contexts/                 # React 上下文（AuthContext）
│   ├── hooks/                    # 自定义 hooks
│   │   ├── useWebSocket.ts
│   │   ├── usePermissions.ts
│   │   ├── useMessages.ts
│   │   ├── useGenerationResume.ts
│   │   └── useToast.ts
│   ├── services/                 # AI 服务/导出服务
│   ├── styles/                   # CSS（tailwind.css, animations.css, landing.css）
│   ├── types.ts                  # 全局类型定义
│   └── utils.ts                  # 工具函数
├── server/                       # 后端（Express）
│   ├── src/
│   │   ├── routes/               # API 端点（21 个路由模块）
│   │   ├── controllers/          # 控制器层（12 个模块）
│   │   ├── services/             # 业务逻辑层（40+ 个服务）
│   │   ├── middleware/           # 单数：rateLimit, validate
│   │   ├── middlewares/          # 复数：auth, requirePermission, upload
│   │   ├── validators/           # Zod 验证器
│   │   ├── utils/                # 工具函数（logger, jwt, 内容过滤等）
│   │   ├── types/                # 类型定义（agent, user, express）
│   │   ├── constants/            # 常量（colorPalette）
│   │   ├── bootstrap/            # 启动引导
│   │   ├── jobs/                 # 定时任务（cron.ts）
│   │   ├── scripts/              # 运维脚本（seed, unlock）
│   │   └── __tests__/            # 后端测试（Bun）
│   │       ├── setup.ts
│   │       ├── integration/
│   │       └── services/
│   ├── prisma/                   # 数据库
│   │   ├── schema.prisma         # 32 个模型
│   │   ├── migrations/
│   │   ├── seed_builtin.ts       # 内置种子
│   │   ├── seed_users.ts         # 用户种子
│   │   ├── seed_orders.ts        # 订单种子
│   │   └── seed_permissions_v9.ts# 权限种子
│   └── uploads/                  # 本地文件存储
├── docs/                         # 项目文档（架构/数据库/API 等）
├── scripts/                      # 运维 bat 脚本
└── tests/e2e/                    # Playwright E2E 测试
```

## 核心架构说明

- **AI 提供商**：基于 Router-Adapter 适配器架构灵活切换全球各大厂商生成模型 — Gemini（原生 SDK）、火山引擎、智谱、DeepSeek、SiliconFlow、ModelScope、OpenAI-compatible、本地 Ollama、CustomCombo 等，按任务类型（生图/推理/视觉分析）自动路由最优模型资源
- **Agent 模式**：自然语言驱动 PPT 生成，9 个 function-calling 工具，SSE 进度 + WebSocket 同步
- **RBAC**：7 个角色（USER → SUPER_ADMIN），通过 `requirePermission()` 中间件检查权限
- **积分与计费**：VIP 定价、限流（slide_image 30/小时，默认 100/小时）、事务生命周期（Pending → Completed → Refunded）
- **支付系统**：支付宝 / 微信（当前 Mock 模式，需配置商户密钥启用），完整退款引擎（7 项风控规则）
- **WebSocket**：基于 `projectId` 的项目房间广播，JWT 认证，30 秒心跳
- **Vite 代理**：`/api` → `http://127.0.0.1:1111`，支持 SSE 长连接
- **通知集群**：ai-notification | admin-notification | vip-notification | order-notification | security-notification

## 关键机制

### .env 热重载
后端通过 `fs.watch` 监听 `.env` 文件变化，自动调用 `SettingService.reloadEnv()`。注意：AI 配置仅在首次启动时从 .env 写入数据库，之后以管理后台为准。非 AI 配置（JWT、CORS、端口等）修改后需重启服务。

### Token 自动刷新
前端 API 客户端（`src/api/client.ts`）内置 401 拦截 + 自动刷新流程：
1. 捕获 401 响应 → 尝试调用 `/api/auth/refresh`
2. 并发失败请求自动入队，刷新完成后批量重试
3. 刷新失败 → 派发 `window.dispatchEvent(new CustomEvent('auth:logout'))`
超时配置：10 分钟（适配 4K AI 图片生成）

### 速率限制系统
`server/src/middleware/rateLimitMiddleware.ts` 实现 7 层分级限速：
- `generalLimiter`: 通用请求（开发 10000/min, 生产 300/min）
- `aiLimiter`: AI 生成调用（开发 500/min, 生产 30/min）
- `adminLimiter`: 管理员请求
- `uploadLimiter`: 文件上传
- Agent 专用 limiter（session/message/task）

**开发环境自动绕过**：`NODE_ENV !== 'production'` 或 `origin` 含 `localhost`/`127.0.0.1` 时跳过所有限流。

### 后端启动序列
`server/src/app.ts` 按顺序执行：
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

### Bootstrap 启动引导
`server/src/bootstrap/admin.bootstrap.ts` 自动执行：
- 管理员账号（`BOOTSTRAP_ADMIN_EMAIL`/`USERNAME`/`PASSWORD` 环境变量）
- 12 条默认权限记录
- 5 条默认积分规则

### 平滑关闭
处理 `SIGTERM`/`SIGINT`/`uncaughtException`/`unhandledRejection`：
1. 停止接收新请求
2. 关闭 WebSocket 服务
3. 断开 Prisma 连接
4. 10 秒超时后强制退出

### 快照系统
`server/src/services/snapshot.service.ts` + `snapshot.routes.ts`:
- 基于项目的快照版本控制，支持创建/回滚/删除
- 与 Agent 对话深度绑定，每个对话节点可创建快照
- 前端通过 `src/api/agent.ts` 的 snapshot 相关 mutation 交互

### 回收站（软删除）
`server/src/services/trash.service.ts` + `trash.routes.ts`:
- 项目/模板软删除，支持恢复和彻底清除
- 前端入口: `src/components/TrashPage.tsx`（已懒加载）

### 消息与通知系统
- **消息**: `message.service.ts` + `message-archive.service.ts` + `message-template.service.ts` + `message-settings.service.ts`
- **通知集群**: `ai-notification` | `admin-notification` | `vip-notification` | `order-notification` | `security-notification` | `activity-notification` | `points-notification`
- **通知路由**: `notification.routes.ts` — 轮询新通知、标记已读
- **前端入口**: `src/components/message/MessagesPage.tsx`（已懒加载）、`NotificationBell.tsx`

### 支付与退款系统
- **支付服务**: `server/src/services/payment/alipay.service.ts` + `wechat.service.ts`
- **退款引擎**: `refund.service.ts` + `refund-processor.service.ts` + `refund-edge-cases.service.ts` + `refund-exception.service.ts` + `refund-notification.service.ts`
- **风控规则**: 7 项规则（反欺诈、频率检测、金额阈值等）+ 自动审批 + 权益回收
- **订单服务**: `order.service.ts` + `product.service.ts`

### MinerU 文档解析
`mineru.service.ts` + `mineru.routes.ts` — 环境变量 `DOC_PARSER_PROVIDER`/`DOC_PARSER_KEY`/`DOC_PARSER_BASE` 控制。
Vite 开发代理转发到 MinerU 的 Web 端和 OSS 端。

### 资源与配额管理
- **资源服务**: `resource.service.ts` + `resource-cleanup.service.ts` — 上传资源管理 + 定时清理
- **配额服务**: `quota.service.ts` — AI 调用额度跟踪
- **审计服务**: `audit.service.ts` — 操作审计日志

## 关键文件

| 功能 | 文件 |
|------|------|
| 前端主入口 | `src/App.tsx`（~5000 行，包含路由和状态编排）|
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts`（含 Token 自动刷新）|
| API hooks | `src/api/`（17 个模块，TanStack Query hooks）|
| 权限守卫 | `src/components/PermissionGuard.tsx` |
| 权限 Hook | `src/hooks/usePermissions.ts` |
| Agent 前端 | `src/components/AgentView.tsx` |
| 后端入口 | `server/src/app.ts` |
| 启动引导 | `server/src/bootstrap/admin.bootstrap.ts` |
| AI 路由服务 | `server/src/services/ai.service.ts`（6+ 提供商，1 分钟缓存）|
| Agent 服务 | `server/src/services/agent.service.ts`（~108KB，9 大 AI 工具）|
| WebSocket 服务 | `server/src/services/websocket.service.ts` |
| 积分服务 | `server/src/services/points.service.ts` |
| 退款引擎 | `server/src/services/refund.service.ts` |
| 支付服务 | `server/src/services/payment/alipay.service.ts` / `wechat.service.ts` |
| 快照服务 | `server/src/services/snapshot.service.ts` |
| 回收站服务 | `server/src/services/trash.service.ts` |
| MinerU 解析 | `server/src/services/mineru.service.ts` |
| 数据库 Schema | `server/prisma/schema.prisma`（32 个模型）|
| 速率限制 | `server/src/middleware/rateLimitMiddleware.ts` |
| RBAC 中间件 | `server/src/middlewares/auth.middleware.ts` |
| Zod 验证器 | `server/src/validators/index.ts` |
| Cron 调度器 | `server/src/jobs/cron.ts`（setTimeout 实现）|
| 内容过滤 | `server/src/utils/content-filter.ts` |
| Prompt 安全 | `server/src/utils/prompt-security.ts` |
| Token 工具 | `server/src/utils/jwt.util.ts` |
| 日志工具 | `server/src/utils/logger.ts` |

## 非标准偏差（已知问题）

1. **Tailwind v4** 通过 Vite 插件引入（非 PostCSS 集成）
2. **中间件目录不一致**：存在 `middleware/`（单数）和 `middlewares/`（复数）两个目录
3. **两个独立 package.json**（非 monorepo workspaces）
4. **混合测试运行器**：Vitest + Playwright（前端），Bun（后端）
5. **Prisma 单例** 通过 `globalThis.prisma` 防止热重载泄漏
6. **Cron 调度** 使用 `setTimeout` 而非 node-cron
7. **`src/App.tsx`** 约 5000 行，包含所有路由和状态编排（单体组件）
