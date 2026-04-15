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

### 运行单个测试
```bash
npx vitest src/utils.test.ts              # Vitest 单文件测试
npx vitest -t "具体测试名称"               # Vitest 按名称测试
npx playwright test tests/e2e/foo.spec.ts # Playwright 单文件测试
npx playwright test -g "测试名称"          # Playwright 按名称测试
npx playwright test --headed              # 显示浏览器窗口
```

### 后端（server/）
```bash
cd server
npm run dev          # ts-node src/app.ts → localhost:1111
npm run build        # tsc 编译 → dist/
npm start            # node dist/app.js
npm test             # Bun 测试
npm test:watch       # Bun 监听模式
npx prisma db push   # 同步数据库结构（开发环境）
npx prisma migrate dev --name <名称>  # 创建数据库迁移
npx prisma studio    # 数据库 GUI
```

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
├── src/                    # 前端（React）
│   ├── api/                # API 客户端 + TanStack Query hooks
│   ├── components/         # React 组件（admin/, auth/, user/）
│   ├── contexts/           # React 上下文（AuthContext）
│   ├── hooks/              # 自定义 hooks（useWebSocket, usePermissions）
│   ├── services/           # Gemini/导出服务
│   ├── styles/             # CSS
│   ├── types.ts            # 全局类型定义
│   └── utils.ts            # 工具函数
├── server/                 # 后端（Express）
│   ├── src/
│   │   ├── routes/         # API 端点
│   │   ├── services/       # 业务逻辑（ai, agent, points）
│   │   ├── middleware/    # 单数：rateLimit, validate
│   │   ├── middlewares/   # 复数：auth, requirePermission, upload
│   │   └── utils/          # 内容过滤、提示词安全
│   ├── prisma/             # 数据库结构 + 迁移 + 种子
│   └── uploads/            # 本地文件存储
└── tests/e2e/              # Playwright E2E 测试
```

## 核心架构说明

- **AI 提供商**：Gemini（原生 SDK）、火山引擎、智谱、SiliconFlow、ModelScope、CustomCombo — 均通过路由适配器模式
- **Agent 模式**：自然语言驱动 PPT 生成，9 个 function-calling 工具，SSE 进度 + WebSocket 同步
- **RBAC**：7 个角色（USER → SUPER_ADMIN），通过 `requirePermission()` 中间件检查权限
- **积分与计费**：VIP 定价、限流（slide_image 30/小时，默认 100/小时）、事务生命周期
- **WebSocket**：基于 `projectId` 的项目房间广播，JWT 认证，30 秒心跳
- **Vite 代理**：`/api` → `http://127.0.0.1:1111`，支持 SSE 长连接

## 关键机制

### .env 热重载
后端通过 `fs.watch` 监听 `.env` 文件变化，自动调用 `SettingService.reloadEnv()` — 修改配置无需重启服务。

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
- **消息**: `message.service.ts` + `message-archive.service.ts` + `message-template.service.ts`
- **通知集群**: `ai-notification` | `admin-notification` | `vip-notification` | `order-notification` | `security-notification`
- **通知路由**: `notification.routes.ts` — 轮询新通知、标记已读
- 前端入口: `src/components/MessagesPage.tsx`（已懒加载）

### MinerU 文档解析
环境变量 `DOC_PARSER_PROVIDER`/`DOC_PARSER_KEY`/`DOC_PARSER_BASE` 控制 MinerU 文档解析服务。
Vite 开发代理转发到 MinerU 的 Web 端和 OSS 端。

## 关键文件

| 功能 | 文件 |
|------|------|
| 主入口 | `src/App.tsx`（~4700 行，包含路由和状态编排）|
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts`（含 Token 自动刷新）|
| API hooks | `src/api/`（TanStack Query hooks）|
| 后端入口 | `server/src/app.ts` |
| AI 路由 | `server/src/services/ai.service.ts` |
| Agent 服务 | `server/src/services/agent.service.ts` |
| WebSocket | `server/src/services/websocket.service.ts` |
| 积分服务 | `server/src/services/points.service.ts` |
| 退款引擎 | `server/src/services/refund.service.ts` |
| 数据库 | `server/prisma/dev.db` |
| RBAC 中间件 | `server/src/middlewares/requirePermission.ts` |

## 非标准偏差（已知问题）

1. **Tailwind v4** 通过 Vite 插件引入（非 PostCSS 集成）
2. **中间件目录不一致**：存在 `middleware/`（单数）和 `middlewares/`（复数）两个目录
3. **两个独立 package.json**（非 monorepo workspaces）
4. **混合测试运行器**：Vitest + Playwright（前端），Bun（后端）
5. **Prisma 单例** 通过 `globalThis.prisma` 防止热重载泄漏
6. **Cron 调度** 使用 `setTimeout` 而非 node-cron
