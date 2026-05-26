# YH-AI 智能PPT创作平台 - Copilot 指令

**技术栈**: React 19.2 + Vite 6.2 + Tailwind CSS 4.1 | Express 5.2 + Prisma 6.19 + SQLite

## 项目结构

```
/          → 前端 (React)
server/    → 后端 (Express)
docs/      → 完整项目文档
```

## 快速命令

**前端** (根目录):
- `npm run dev` → localhost:1000
- `npm run build` / `npm run preview`
- `npm test` / `npm run test:run` / `npm run test:e2e`

**后端** (cd server):
- `npm run dev` → localhost:1111
- `npm run build` / `npm start`
- `npm test` / `npm run db:seed`
- `npx prisma db push` / `npx prisma studio`

**提交前**: `npx vitest run` + `cd server && bun test`，并对修改文件运行 `lsp_diagnostics`

## 架构要点

- **非 monorepo**: 前后端独立 package.json
- **后端分层**: Routes → Controllers → Services → Prisma (Controller 禁止直接调 Prisma)
- **Vite 代理**: `/api` → `http://127.0.0.1:1111`, `/uploads` → 后端静态文件
- **Token**: 存储 key `bananaslides_token`，请求头 `Authorization: Bearer <token>`
- **前端别名**: `@/*` → `./src/*`
- **测试账号**: `admin` / `admin12345678` (SUPER_ADMIN, 永久 VIP)

## 代码规范

- 禁止 `any`、`@ts-ignore`、`as any` (后端 strict 模式)
- 组件 PascalCase, hooks camelCase + `use` 前缀, 常量 UPPER_SNAKE_CASE
- Props 内联接口 或 `src/types.ts`
- Tailwind v4 (Vite 插件), Framer Motion 动画, Lucide React 图标
- 弹窗组件: `isOpen` + `onClose` props
- 服务端状态: TanStack Query

## 关键反模式

1. 禁止 `variants[0]` → 用专用预览字段
2. 禁止存 File 对象 → 立即 `asset.service.ts` 转 URL
3. 禁止中文标点（。！？）在 PPT 标题/列表
4. 禁止清空项目 ID
5. 幻灯片更新必须用 `syncSlidesMutation`
6. AI 调用前必须 `checkRateLimit()`
7. 禁止空 catch 块
8. 禁止 Controller 直接调 Prisma
9. 禁止绕过 Zod 验证
10. 提交前运行 `lsp_diagnostics`

## 文档导航

- 完整开发指南: [AGENTS.md](../AGENTS.md)
- 系统架构: [docs/02_Architecture/01_系统架构设计.md](../docs/02_Architecture/01_系统架构设计.md)
- AI 引擎: [docs/02_Architecture/07_AI引擎架构设计.md](../docs/02_Architecture/07_AI引擎架构设计.md)
- API 文档: [docs/05_API/01_REST_API/核心接口文档.md](../docs/05_API/01_REST_API/核心接口文档.md)
- 数据字典: [docs/03_Database/01_完整数据字典.md](../docs/03_Database/01_完整数据字典.md)
- 测试指南: [docs/07_Testing/测试计划.md](../docs/07_Testing/测试计划.md)
- 数据库 Schema: [server/prisma/schema.prisma](../server/prisma/schema.prisma)

## 已知偏差

- Tailwind v4 通过 Vite 插件引入 (非 PostCSS)
- `middleware/` (单数) 和 `middlewares/` (复数) 两个目录并存
- Prisma 单例用 `globalThis.prisma` 防热重载
- Cron 用 `setTimeout` 而非 node-cron
- .env 的 AI 配置仅首次写入数据库，之后以管理后台为准