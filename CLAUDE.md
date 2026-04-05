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
npm test             # 运行 Playwright E2E 测试
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

### 测试
```bash
npx playwright test tests/e2e/sanity.spec.ts  # 运行单个测试
npx playwright test --headed                  # 可视化模式
cd server && bun test                         # 后端单元测试
cd server && bun test --watch                 # 后端测试监听模式
```

## 架构要点

### 双端独立架构
- **非 monorepo**: 前后端各有独立的 `package.json`
- **Vite Proxy**: `/api` → `http://127.0.0.1:1111`, `/uploads` → 同后端, `/ws` → WebSocket 代理
- **路径别名**: 前端 `@/*` → `./src/*`
- **SSE 支持**: Vite 代理配置了 SSE 长连接（禁用缓冲），用于 Agent 任务进度推送

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

### WebSocket 实时通信
核心服务: `server/src/services/websocket.service.ts`

- **项目房间机制**: 基于 `projectId` 广播，支持多标签页/多设备同步
- **认证**: JWT 鉴权，连接时验证 token
- **心跳检测**: 30s 间隔，自动清理断连客户端
- **消息类型**: `project_update`, `agent_progress`, `task_complete` 等

### Agent 对话模式
核心服务: `server/src/services/agent.service.ts`

双模式架构：
- **工作台模式**: 手动配置 + 批量生成，精细控制每页
- **Agent 模式**: 自然语言驱动，AI 自动规划执行

关键流程：
1. SSE 流式推送任务进度 (`/api/agent/:sessionId/stream`)
2. WebSocket 广播项目状态变更
3. 乐观更新 UI，服务端响应后无缝替换
4. 消息支持编辑和"重置至此节点"，积分自动退还

前端入口: `src/components/AgentView.tsx`

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

## 关键文件

| 功能 | 文件 |
|------|------|
| 主入口 | `src/App.tsx` (~4700行) |
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts` |
| 类型定义 | `src/types.ts` |
| 后端入口 | `server/src/app.ts` |
| AI 服务 | `server/src/services/ai.service.ts` |
| 积分服务 | `server/src/services/points.service.ts` |
| Agent 服务 | `server/src/services/agent.service.ts` |
| WebSocket 服务 | `server/src/services/websocket.service.ts` |
| 数据库 | `server/prisma/schema.prisma` |

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

1. **禁止** 直接使用 `variants[0]` → 使用专用预览字段
2. **禁止** 存储 File 对象 → 立即转换为 URL
3. **禁止** 在 PPT 标题/列表中使用中文标点（。！？）
4. **禁止** 在项目上下文中清空项目 ID
5. **禁止** 使用通用 project mutation 更新幻灯片 → 使用 `syncSlidesMutation`
6. **禁止** 空 catch 块 → 必须通过 Winston logger 记录
7. **禁止** 跳过 rate limiter → AI 调用前必须检查 `checkRateLimit()`
8. **禁止** 绕过 Zod 验证 → 所有 API 输入必须校验
9. **禁止** 使用敏感词 → 内容过滤器 (`server/src/utils/content-filter.ts`) 检测后拒绝
10. **禁止** Prompt 注入攻击 → `server/src/utils/prompt-security.ts` 阻止系统提示覆盖

## 商业化系统

- **支付**: 支付宝/微信 (当前 Mock 模式，需配置密钥启用)
- **退款**: 完整实现 (风控、自动审批、权益回收)
- **积分**: VIP 专属价格支持
- **权限**: 7 级角色体系 (USER → SUPER_ADMIN)

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

详细文档见 `AGENTS.md` 和 `docs/` 目录。
