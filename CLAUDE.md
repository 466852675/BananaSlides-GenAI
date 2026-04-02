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
npx prisma db push   # 同步数据库 schema
npx prisma studio    # 打开 Prisma DB GUI
npm run db:seed      # 数据库种子数据
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
- **Vite Proxy**: `/api` → `http://127.0.0.1:1111`, `/uploads` → 同后端
- **路径别名**: 前端 `@/*` → `./src/*`

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

### 积分与计费系统
核心服务: `server/src/services/points.service.ts`

- 标准用户支付 `rule.costPoints`
- VIP 用户支付 `rule.vipCostPoints`（通常折扣或免费）
- Admin 永久 VIP 身份

交易生命周期:
1. **Pending**: 扣除积分，`completedAt: null`
2. **Completed**: AI 生成成功，记录完成时间
3. **Refunded**: 失败时创建负金额交易退款

## 关键文件

| 功能 | 文件 |
|------|------|
| 主入口 | `src/App.tsx` |
| 认证上下文 | `src/contexts/AuthContext.tsx` |
| API 客户端 | `src/api/client.ts` |
| 类型定义 | `src/types.ts` |
| 后端入口 | `server/src/app.ts` |
| AI 服务 | `server/src/services/ai.service.ts` |
| 积分服务 | `server/src/services/points.service.ts` |
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

## 商业化系统

- **支付**: 支付宝/微信 (当前 Mock 模式，需配置密钥启用)
- **退款**: 完整实现 (风控、自动审批、权益回收)
- **积分**: VIP 专属价格支持
- **权限**: 6 级角色体系 (USER → SUPER_ADMIN)

详细文档见 `AGENTS.md` 和 `docs/` 目录。
