# AGENTS.md - YH-AI 智能PPT创作平台 开发指南

**技术栈：** React 19.2 + Vite 6.2 + Express 5.2 + Prisma 6.19 + SQLite
**项目结构：** 两个独立包 — 根目录（前端）+ `server/`（后端）

> 📖 详细文档见 `docs/` 目录。快速入口：[开发环境搭建](docs/06_Guides/01_开发指南/开发环境搭建.md) · [系统架构](docs/02_Architecture/01_系统架构设计.md) · [API 文档](docs/05_API/01_REST_API/核心接口文档.md) · [数据字典](docs/03_Database/01_完整数据字典.md) · [测试指南](docs/07_Testing/测试计划.md)

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

### 运维脚本
```bash
一键启动.bat         # Windows 一键启动前后端
scripts\启动应用.bat  # 同时启动前后端
scripts\停止服务.bat  # 终止 Node/Vite 进程
scripts\初始化数据库.bat  # Prisma push + seed
scripts\备份数据库.bat    # SQLite dump
scripts\强制重置数据库(慎用).bat  # 删除 dev.db 后重建
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

### 测试账号（开发环境）
管理员账号（由 Bootstrap 自动创建）：
- 邮箱: `admin@local` / 用户名: `admin` / 密码: `admin12345678`
- 角色: **SUPER_ADMIN**（永久 VIP）
- Token 存储 key：`bananaslides_token`

### 提交前验证
```bash
npx vitest run              # 前端单元测试
npx playwright test         # E2E 测试
cd server && bun test       # 后端测试
# 始终对修改过的文件运行 lsp_diagnostics
```

## Vite 代理配置

| 路由 | 目标 | 说明 |
|------|------|------|
| `/api` | `http://127.0.0.1:1111` | 后端 API + SSE 长连接（禁用缓冲） |
| `/uploads` | 同后端 | 静态文件 |
| `/ws` | WebSocket 升级代理 | 项目房间广播 |
| `/mineru-proxy` | `https://mineru.net` | 文档解析 |
| `/mineru-oss-proxy` | `https://mineru.oss-cn-shanghai.aliyuncs.com` | MinerU OSS |

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
│   ├── contexts/                 # AuthContext
│   ├── hooks/                    # useWebSocket, usePermissions, useMessages 等
│   ├── services/                 # AI 服务/导出服务
│   ├── styles/                   # CSS（tailwind.css, animations.css, landing.css）
│   ├── types.ts                  # 全局类型定义
│   └── utils.ts                  # 工具函数
├── server/                       # 后端（Express）
│   ├── src/
│   │   ├── routes/               # API 端点（21 个路由模块）
│   │   ├── controllers/          # 控制器层（12 个模块）
│   │   ├── services/             # 业务逻辑层（40+ 个服务）
│   │   ├── middleware/           # rateLimit, validate
│   │   ├── middlewares/          # auth, requirePermission, upload
│   │   ├── validators/           # Zod 验证器
│   │   ├── utils/                # logger, jwt, 内容过滤等
│   │   ├── types/                # 类型定义
│   │   ├── constants/            # 常量（colorPalette）
│   │   ├── bootstrap/            # 启动引导
│   │   ├── jobs/                 # 定时任务（cron.ts）
│   │   ├── scripts/              # seed, unlock
│   │   └── __tests__/            # 后端测试（Bun）
│   ├── prisma/                   # 数据库（32 个模型）
│   └── uploads/                  # 本地文件存储
├── docs/                         # 项目文档（架构/数据库/API 等）
├── scripts/                      # 运维 bat 脚本
└── tests/e2e/                    # Playwright E2E 测试
```

## 关键文件索引

| 功能 | 文件 |
|------|------|
| 前端主入口 | `src/App.tsx`（~5000 行） |
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts`（Token 自动刷新） |
| API hooks | `src/api/`（17 个模块） |
| 权限守卫 | `src/components/PermissionGuard.tsx` |
| Agent 前端 | `src/components/AgentView.tsx` |
| 后端入口 | `server/src/app.ts` |
| AI 路由服务 | `server/src/services/ai.service.ts` |
| Agent 服务 | `server/src/services/agent.service.ts`（108KB，9 工具） |
| WebSocket | `server/src/services/websocket.service.ts` |
| 积分服务 | `server/src/services/points.service.ts` |
| 退款引擎 | `server/src/services/refund.service.ts` |
| 支付服务 | `server/src/services/payment/alipay.service.ts` / `wechat.service.ts` |
| 快照服务 | `server/src/services/snapshot.service.ts` |
| 回收站服务 | `server/src/services/trash.service.ts` |
| MinerU 解析 | `server/src/services/mineru.service.ts` |
| 速率限制 | `server/src/middleware/rateLimitMiddleware.ts` |
| RBAC 中间件 | `server/src/middlewares/auth.middleware.ts` |
| Zed 验证器 | `server/src/validators/index.ts` |
| Cron 调度器 | `server/src/jobs/cron.ts`（setTimeout） |
| 内容过滤 | `server/src/utils/content-filter.ts` |
| Prompt 安全 | `server/src/utils/prompt-security.ts` |

## 核心架构概述

详细架构文档参见：[系统架构](docs/02_Architecture/01_系统架构设计.md) · [AI 引擎架构](docs/02_Architecture/07_AI引擎架构设计.md) · [API 架构](docs/02_Architecture/06_API架构设计.md)

- **AI 提供商**：Router-Adapter 架构，支持 Gemini / 火山引擎 / 智谱 / DeepSeek / SiliconFlow / ModelScope / OpenAI-compatible / Ollama / CustomCombo，按任务类型自动路由
- **Agent 模式**：自然语言驱动 PPT 生成，9 个 function-calling 工具，SSE + WebSocket 进度推送
- **RBAC**：7 角色体系，通过 `requirePermission()` 中间件检查
- **支付**：支付宝/微信（Mock 模式），完整退款引擎（7 项风控规则）
- **Layered Backend**：Routes → Controllers → Services → Prisma（严格分层）
- **前端 Provider 栈**：`React.StrictMode > QueryClientProvider > AuthProvider > App`

### 关键机制速查

| 机制 | 说明 | 关键文件/配置 |
|------|------|---------------|
| .env 热重载 | AI 配置首次启动写入数据库，之后以管理后台为准 | `SettingService.reloadEnv()` |
| Token 自动刷新 | 401 自动刷新 + 并发请求队列 + 失败触发 `auth:logout` 事件 | `src/api/client.ts` |
| 速率限制 | 7 层分级，开发环境自动跳过 | `rateLimitMiddleware.ts` |
| WebSocket | 项目房间广播，JWT 认证，30s 心跳 | `websocket.service.ts` |
| 启动序列 | 加载 .env → CORS → 限流 → 路由 → 热重载 → 端口 → Bootstrap → WebSocket → Cron | `server/src/app.ts` |
| Bootstrap | 自动创建管理员账号 + 12 条权限 + 5 条积分规则 | `admin.bootstrap.ts` |
| 平滑关闭 | SIGTERM/SIGINT → 停请求 → 关 WebSocket → 断 Prisma → 10s 超时 | `server/src/app.ts` |

## 非标准偏差（已知问题）

1. **Tailwind v4** 通过 Vite 插件引入（非 PostCSS）
2. **中间件目录不一致**：`middleware/`（单数）和 `middlewares/`（复数）
3. **两个独立 package.json**（非 monorepo）
4. **混合测试运行器**：Vitest + Playwright（前端）· Bun（后端）
5. **Prisma 单例** 通过 `globalThis.prisma` 防热重载泄漏
6. **Cron 调度** 使用 `setTimeout` 而非 node-cron
7. **`src/App.tsx`** 约 5000 行单体组件
