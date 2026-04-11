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
- Tailwind CSS v4.1（原子化，通过 `@tailwindcss/vite`）
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

## 关键反模式

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
│   │   ├── middlewares/    # 认证、RBAC、限流
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

## 非标准偏差

1. Tailwind v4 通过 Vite 插件引入（非构建集成）
2. 后端同时存在 `middleware/` 和 `middlewares/` 目录
3. 两个独立的 `package.json`（非 monorepo workspaces）
4. 混合测试运行器：Vitest + Playwright（前端），Bun（后端）
5. Prisma 单例通过 `globalThis.prisma` 防止热重载泄漏
6. `.env` 热重载：`fs.watch` → `SettingService.reloadEnv()`
