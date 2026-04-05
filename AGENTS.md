# AGENTS.md - YH-AI PPT Development Guide

**Generated:** 2026-02-22
**Last Updated:** 2026-04-06
**Version:** v1.3.0
**Stack:** React 19.2 + Vite 6.2 + Express 5.2 + Prisma 6.19 + SQLite

## Quick Commands

### Frontend (Root Directory)
```bash
npm run dev          # Start dev server (localhost:1000)
npm run build        # Production build
npm run preview      # Preview production build
npm test            # Run Playwright E2E tests
```

### Backend (server/ Directory)
```bash
cd server
npm run dev          # Start API server (localhost:1111)
npm run build        # Compile TypeScript
npm start            # Run compiled server
npx prisma db push   # Sync database schema
npx prisma studio    # Open Prisma DB GUI
```

### Testing
```bash
# Run single Playwright test
npx playwright test tests/e2e/sanity.spec.ts

# Run with headed mode (visible browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "sanity"
```

### Database Operations
```bash
# Sync schema to database (dev)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name migration_name
npx prisma migrate deploy

# Seed data
npx prisma db seed

# Database validation
npx prisma validate
```

## Code Style Guidelines

### TypeScript
- **Backend**: Strict mode enabled (`"strict": true` in server/tsconfig.json)
- **Frontend**: Relaxed mode with `DOM`, `DOM.Iterable`, `ES2022` lib
- **No type suppression**: Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Use explicit types for function parameters and return values

### React Components
- **Naming**: PascalCase for components (`Dashboard.tsx`, `LoginModal.tsx`)
- **Pattern**: Functional components with hooks only, no class components
- **Props**: Define interfaces inline or in `src/types.ts`
- **Imports**: Organize by category - React → Libraries → Components → Utils/Contexts/APIs

### Styling
- **Framework**: Tailwind CSS v4.1 (utility-first)
- **Animations**: Framer Motion for "breathing" feedback during AI operations
- **Icons**: Lucide React (`import { IconName } from 'lucide-react'`)
- **Effects**: Glassmorphism patterns (`backdrop-blur-md bg-white/80`)

### State Management
- **Local state**: `useState`, `useReducer`
- **Server state**: TanStack Query (`@tanstack/react-query`)
- **Auth**: `AuthContext.tsx` for JWT session management
- **Patterns**:
  - Modal components: Accept `isOpen` and `onClose` props
  - Toast notifications: Use `react-hot-toast`
  - Image handling: Always use URL strings, never File objects

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Dashboard.tsx`, `ResultCard.tsx` |
| Hooks | camelCase + "use" prefix | `useAuth`, `useMessages` |
| Variables | camelCase | `isScrolled`, `billingCycle` |
| Constants | UPPER_SNAKE_CASE | `STYLE_PRESETS`, `COLOR_PRESETS` |
| Interfaces | PascalCase | `ProjectSession`, `StyleConfig` |
| Type Aliases | camelCase | `PageType`, `GlobalStyleMap` |
| File imports | Named imports preferred | `import { UserWidget } from './auth'` |

## Error Handling

- **Backend**: Use `try/catch` with Winston logger, never empty catch blocks
- **Frontend**: Use React Error Boundaries, display toast on failures
- **API errors**: Return structured errors with Zod validation schemas
- **Anti-pattern**: Never suppress errors with empty catch blocks

## API Patterns

### Frontend → Backend
- Proxy via Vite: `/api` → `http://127.0.0.1:1111`
- Auth: JWT via `Authorization: Bearer <token>` header
- File uploads: POST to `/uploads` endpoint

### Backend Routes
- Express 5.x router pattern
- Rate limiting via `express-rate-limit`
- Zod for request validation

## Critical Anti-Patterns

1. **Never** use `variants[0]` directly — use dedicated preview fields
2. **Never** store File objects — always convert to URLs immediately
3. **Never** use Chinese punctuation (。！？) in PPT titles/lists
4. **Never** clear project ID when inside project context
5. **Always** use `syncSlidesMutation` for slide updates, not generic project mutation
6. **Never** commit without running `lsp_diagnostics` on changed files

## Project Structure

```
YH-AI PPT/
├── src/
│   ├── api/              # API client functions
│   ├── components/        # React components (34 files)
│   │   ├── admin/        # RBAC & management (20 files)
│   │   ├── auth/         # Login & auth (4 files)
│   │   └── user/         # Profile & settings (3 files)
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── services/         # Gemini/export services
│   ├── styles/           # CSS files
│   ├── types.ts          # Global type definitions
│   └── utils.ts          # Utility functions
├── server/               # Express backend
│   ├── src/             # Server source
│   ├── prisma/          # Database schema & migrations
│   └── scripts/         # DB & migration scripts
├── tests/e2e/           # Playwright E2E tests
├── docs/                # Specification documents
└── image/               # Assets for README
```

## Key Files Reference

| Component | File | Purpose |
|-----------|------|---------|
| Main Dashboard | `src/components/Dashboard.tsx` | Project workspace UI |
| Outline Editor | `src/components/OutlineGenerator.tsx` | AI outline generation |
| Style Templates | `src/components/StyleTemplateManager.tsx` | Visual theme system |
| Result Display | `src/components/ResultCard.tsx` | Slide preview/variants |
| Auth Context | `src/contexts/AuthContext.tsx` | JWT session management |
| Type Defs | `src/types.ts` | 167 lines of shared interfaces |
| **Agent View** | **`src/components/AgentView.tsx`** | **Agent对话式生成UI** |
| **Agent Service** | **`server/src/services/agent.service.ts`** | **Agent核心逻辑** |
| **WebSocket Service** | **`server/src/services/websocket.service.ts`** | **实时通信服务** |
| **Agent Routes** | **`server/src/routes/agent.routes.ts`** | **Agent API端点** |
| **Agent Types** | **`server/src/types/agent.types.ts`** | **Agent类型定义** |

## Development Notes

- **Path aliases**: Frontend uses `@/*` → `./src/*` (configured in vite.config.ts)
- **Browser target**: ES2022, supports modern CSS features
- **Database**: SQLite via Prisma ORM (file: `./server/prisma/dev.db`)
- **AI Providers**: Gemini, Volcengine, Zhipu, CustomCombo (router-adapter pattern)

## Backend Entry Points

**Main Server**: `server/src/app.ts` (Express 5, port 1111)
- **Secondary Server**: `server/index.ts` (MinerU proxy)

## Structure Deviations (Non-Standard Patterns)

1. **Tailwind v4 via CDN** - Not build-integrated (`index.html` line 8)
2. **Dual middleware dirs** - Both `middleware/` and `middlewares/` exist
3. **No monorepo workspaces** - Two independent package.json files
4. **Mixed test runners** - Playwright (frontend) + Bun (backend)
5. **Multiple AI agent configs** - .claude, .opencode, .sisyphus at root

---

## Architecture

### AI Model Routing (Multi-Provider System)

**Core Service**: [server/src/services/ai.service.ts](server/src/services/ai.service.ts)

The system supports 6+ AI providers with automatic protocol detection:

**Providers Supported:**
- Gemini (Google Native + OpenAI-compatible)
- Zhipu AI (GLM models)
- Volcengine (Doubao models)
- SiliconFlow (DeepSeek + FLUX)
- ModelScope (Qwen + GLM)
- CustomCombo (Mixed providers per task type)

**Key Pattern - Dual Protocol Support:**
```typescript
// server/src/services/ai.service.ts:523
shouldUseGeminiNative(config, settings) {
  // Priority 1: Google official APIs use Gemini Native SDK
  if (url.includes('googleapis.com')) return true;
  // Priority 2: OpenAI-compatible endpoints use axios
  if (url.includes('/v1') || url.includes('/v3')) return false;
  // Priority 3: Model name detection
  if (model.includes('gemini')) return true;
  return settings?.ai.provider === 'Gemini';
}
```

**Configuration Resolution Flow:**
1. Check database `AiRule` table for active rule
2. Resolve `text`/`image`/`vision` task-specific models
3. Apply CustomCombo config if provider is `CustomCombo`
4. Fallback to environment variable settings
5. Cache results for 1 minute (see `configCache` in ai.service.ts)

**Environment Variables** ([server/.env](server/.env)):
```env
AI_PROVIDER=Volcengine  # Default provider
GEMINI_API_KEY=your-key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
VOLCENGINE_MODEL_TEXT=doubao-pro-256k
COMBO_TEXT_BASE=http://127.0.0.1:8045/v1  # Custom router
```

### Points & Billing System

**Core Service**: [server/src/services/points.service.ts](server/src/services/points.service.ts)

**VIP Pricing Model:**
- Standard users pay `rule.costPoints`
- VIP users pay `rule.vipCostPoints` (often 0 or discounted)
- Admins have permanent VIP status (never expire)

**Key Pattern - Price Resolution:**
```typescript
// server/src/services/points.service.ts:47
getActionCost(actionCode, userId) {
  const rule = await prisma.pointsRule.findUnique({ where: { code: actionCode } });
  if (!userId) return rule.costPoints;
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const isVipValid = isAdmin || (user.vipExpiresAt && user.vipExpiresAt > now);
  
  if (isVipValid && rule.vipCostPoints !== null) {
    return rule.vipCostPoints;
  }
  return rule.costPoints;
}
```

**Rate Limiting:**
- `slide_image`: 30 requests/hour per user
- `default`: 100 requests/hour per user
- Tracked via `Transaction` table with `completedAt` timestamps

**Transaction Lifecycle:**
1. **Pending**: Points deducted, `completedAt: null`
2. **Completed**: AI generation success, `completedAt: new Date()`
3. **Refunded**: Negative amount transaction on failure

### RBAC (Role-Based Access Control)

**7 User Roles:** USER, BASIC, PROFESSIONAL, PREMIUM, ENTERPRISE, ADMIN, SUPER_ADMIN

**Permission Checking:**
```typescript
// server/src/middlewares/requirePermission.ts
requirePermission(permissionCode) {
  return (req, res, next) => {
    if (req.user.role === 'SUPER_ADMIN') return next();
    const hasPermission = await PermissionService.hasPermission(req.user.role, permissionCode);
    if (!hasPermission) return res.status(403).json({ error: '权限不足' });
    next();
  };
}
```

**Frontend Permission Guard:**
```typescript
// src/components/PermissionGuard.tsx
<PermissionGuard permission="admin.users.manage">
  <Button>Delete User</Button>
</PermissionGuard>
```

**Hook Usage:**
```typescript
// src/hooks/usePermissions.ts
const { hasPermission } = usePermissions();
if (hasPermission('admin.orders.refund')) {
  // Show refund button
}
```

### Database Layer (Prisma ORM)

**Pattern**: Service → Controller → Prisma (never Prisma in controllers)

**Transaction Example:**
```typescript
// server/src/services/points.service.ts:378
await prisma.$transaction([
  prisma.user.update({ where: { id: userId }, data: { points: newBalance } }),
  prisma.transaction.create({ data: { userId, type, amount, balance: newBalance } })
]);
```

**Prisma Client Singleton:**
```typescript
// server/src/db.ts
export const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
```

**Key Models:**
- `User`: Authentication + VIP status
- `Order`: Billing records with `productId` foreign key
- `Product`: Pricing definitions (VIP_MONTHLY, PROFESSIONAL, etc.)
- `Transaction`: Points ledger with `type: 'consume'|'recharge'|'reward'`
- `Project`: User PPT projects
- `AiRule`: AI model routing rules
- `RolePermission`: Many-to-many role-permission mapping
- **`AgentSession`**: Agent会话，绑定项目
- **`AgentMessage`**: 消息历史，支持编辑/重置
- **`AgentTask`**: 任务队列，状态追踪

**Agent API 端点**:
```
POST   /api/agent/sessions                 创建会话
GET    /api/agent/sessions/:id             获取会话详情
POST   /api/agent/sessions/:id/messages    发送消息
DELETE /api/agent/sessions/:id/messages/:msgId  删除消息
POST   /api/agent/sessions/:id/messages/:msgId/reset  重置至此节点
GET    /api/agent/sessions/:id/progress    SSE进度流
GET    /api/agent/sessions/:id/tasks       获取任务列表
POST   /api/agent/sessions/:id/tasks/:taskId/confirm  确认任务
POST   /api/agent/sessions/:id/tasks/:taskId/modify   修改任务参数
```

### Agent 模式架构

**Core Service**: [server/src/services/agent.service.ts](server/src/services/agent.service.ts)

YH-AI PPT 提供两种并行的 PPT 创作范式：

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| **工作台模式** | 手动配置 + 批量生成 | 精细控制每页内容 |
| **Agent 模式** | 自然语言驱动，AI 自动规划 | 快速创作、非技术用户 |

**双模式数据共享**：
- 共享状态层：`items` / `config` / `styleMap`
- WebSocket 实时同步两端操作

**执行模式权限**：
| 模式 | 说明 | 最低角色 |
|------|------|----------|
| GUIDED | 每个关键步骤需用户确认 | USER |
| AUTO | AI 自动执行全流程 | PROFESSIONAL |

**Agent 数据模型** (Prisma Schema):
```prisma
model AgentSession {
  id          String   @id @default(uuid())
  projectId   String
  mode        AgentMode      @default(GUIDED)
  status      AgentSessionStatus @default(ACTIVE)
  // ...
}

model AgentMessage {
  id         String   @id @default(uuid())
  sessionId  String
  role       String   // "user" | "assistant"
  content    String
  isEdited   Boolean  @default(false)
  // ...
}

model AgentTask {
  id         String   @id @default(uuid())
  sessionId  String
  messageId  String
  type       AgentTaskType
  status     AgentTaskStatus @default(PENDING)
  costPoints Int?
  // ...
}
```

**9 大 AI 工具 (Function Calling)**:
| 工具名称 | 功能 | 参数 |
|----------|------|------|
| `generate_outline` | 生成PPT大纲 | topic, keywords, pageCount |
| `modify_outline` | 修改大纲 | outlineId, changes |
| `generate_content` | 生成页面内容 | slideIndex, title, description |
| `modify_content` | 修改页面内容 | slideIndex, content |
| `generate_image` | 生成配图 | slideIndex, style, prompt |
| `regenerate_image` | 重新生成配图 | slideIndex, feedback |
| `apply_style` | 应用风格模板 | styleTemplateId |
| `import_document` | 导入文档 | documentUrl, type |
| `export_ppt` | 导出PPT | format (PDF/PPTX/ZIP) |

**Agent 权限检查**:
```typescript
// server/src/routes/agent.routes.ts
router.post('/sessions',
  authenticate,
  requirePermission('agent.session.create'),
  async (req, res) => {
    // AUTO 模式需要 PROFESSIONAL+ 权限
    if (mode === 'AUTO') {
      const autoRoles = ['PROFESSIONAL', 'PREMIUM', 'ENTERPRISE', 'ADMIN', 'SUPER_ADMIN'];
      if (!autoRoles.includes(user.role)) {
        return res.status(403).json({ error: '需要升级到专业版' });
      }
    }
  }
);
```

### WebSocket 实时通信

**Core Service**: [server/src/services/websocket.service.ts](server/src/services/websocket.service.ts)

**项目房间机制**:
- 基于 `projectId` 广播，支持多标签页/多设备同步
- JWT 鉴权，连接时验证 token
- 心跳检测：30s 间隔，自动清理断连客户端

**连接方式**:
```typescript
// 前端 Hook
const ws = new WebSocket(`ws://localhost:1111/ws?token=${jwtToken}`);

// 使用示例
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { isConnected, subscribe, sendMessage } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe('project-uuid', (message) => {
        console.log('Received:', message);
      });
    }
  }, [isConnected]);
}
```

**消息类型**:
| 类型 | 方向 | 说明 |
|------|------|------|
| `subscribe` | 客户端→服务端 | 订阅项目房间 |
| `unsubscribe` | 客户端→服务端 | 取消订阅 |
| `slides_update` | 服务端→客户端 | 幻灯片更新广播 |
| `agent_progress` | 服务端→客户端 | Agent 任务进度 |
| `task_complete` | 服务端→客户端 | 任务完成通知 |

### SSE 进度流

**端点**: `/api/agent/sessions/:sessionId/progress`

**连接方式**:
```typescript
const eventSource = new EventSource(
  `/api/agent/sessions/${sessionId}/progress?token=${jwtToken}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

**Vite 代理配置** (已配置 SSE 长连接):
```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:1111',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('Connection', 'keep-alive');
      });
    }
  }
}
```

**调试技巧**:
1. WebSocket 连接状态: DevTools → Network → WS
2. SSE 连接状态: DevTools → Network → EventStream
3. 后端日志: `server/logs/` 目录

---

## Project Conventions

### Anti-Patterns (Critical)

1. **Never use `variants[0]` directly** - Use dedicated preview fields
2. **Never store File objects** - Always convert to URLs immediately via `asset.service.ts`
3. **Never use Chinese punctuation** (。！？) in PPT titles/lists
4. **Never clear project ID** when inside project context
5. **Always use `syncSlidesMutation`** for slide updates, not generic project mutation
6. **Never bypass rate limiters** - Check `checkRateLimit()` before AI calls
7. **Never empty catch blocks** - Always log via Winston logger
8. **Never use `any` type** - Backend strict mode enforced
9. **Never commit without running `lsp_diagnostics`** on changed files
10. **Never skip Agent message validation** - Validate all message content before AI processing
11. **Never bypass SSE authentication** - Always require JWT token for progress streams
12. **Never edit other users' sessions** - Agent sessions are user-private, enforce ownership check

### API Client Patterns

**Frontend → Backend**:
```typescript
// src/api/client.ts
export const client = axios.create({
  baseURL: '/api',  // Vite proxy to http://127.0.0.1:1111
  timeout: 600000,
});

// JWT Interceptor
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**TanStack Query Hooks**:
```typescript
// src/api/projects.ts
export const useProjects = () => useQuery({
  queryKey: ['projects'],
  queryFn: () => client.get('/projects'),
});

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/projects', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
};
```

### Error Handling

**Backend (Winston + Zod)**:
```typescript
try {
  const validated = Schema.parse(req.body);
  // ...business logic
} catch (error) {
  log.error('[Controller] Operation failed', { error, userId: req.user.id });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '操作失败' }
  });
}
```

**Frontend (Toast + Error Boundaries)**:
```typescript
try {
  await mutation.mutateAsync(data);
  toast.success('操作成功');
} catch (error) {
  toast.error(error.message || '操作失败');
}
```

### Security Patterns

**Content Filter**: [server/src/utils/content-filter.ts](server/src/utils/content-filter.ts)
- Detects sensitive words (gambling, violence, etc.)
- Blocks before AI generation

**Prompt Injection Protection**: [server/src/utils/prompt-security.ts](server/src/utils/prompt-security.ts)
- Blocks system prompt override attempts
- Patterns: "ignore all instructions", "DAN mode", etc.

**Rate Limiting**: [server/src/middlewares/rateLimitMiddleware.ts](server/src/middlewares/rateLimitMiddleware.ts)
```typescript
rateLimit({
  windowMs: 60000,
  max: 30,
  message: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后再试' }
});
```

---

## Integration Points

### External Dependencies

**AI Providers:**
- Gemini: `@google/genai` SDK
- All others: Axios (OpenAI-compatible API)

**File Storage:**
- Local: `server/uploads/` directory
- Image processing: `mammoth` (Word), `jspdf` (PDF)

**Database:**
- SQLite file: `server/prisma/dev.db`
- ORM: Prisma 6.19

### Cross-Component Communication

**Frontend:**
- `AuthContext` - User session state
- `useAuth` hook - Auth state access
- Global events: `auth:logout`, `auth:login`

**Backend:**
- Middleware chain: `authenticate` → `requirePermission` → `rateLimit`
- Service layer: Controllers delegate to services
- Audit logging: `AuditService.logAction()` for all admin operations

### Environment Configuration Hot-Reload

**Pattern**: Watch `.env` file and auto-sync to database
```typescript
// server/src/app.ts:120
fs.watch(envPath, (event, filename) => {
  SettingService.reloadEnv();  // Updates process.env + DB
});
```
