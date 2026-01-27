# AGENTS.md - BananaSlides-GenAI

## 项目概述
BananaSlides-GenAI 是一个 React + TypeScript 应用，包含 Express 后端。使用 Vite 进行前端打包，Playwright 进行端到端测试，并集成了 AI 服务（Google Gemini、OpenAI 等）用于 PPT 生成。

## 项目结构
```
/ (根目录)          → 前端: React + TypeScript + Vite
/server            → 后端: Express + TypeScript + Prisma
/src               → 前端源代码
/tests/e2e         → Playwright 端到端测试
```

## 构建、代码检查和测试命令

### 前端（根目录）
| 命令 | 描述 |
|------|------|
| `npm run dev` | 在 localhost:1000 启动 Vite 开发服务器 |
| `npm run build` | 构建生产版本（输出到 dist/） |
| `npm run preview` | 预览生产版本 |
| `npm run test` | 运行 Playwright 测试 |

### 后端（/server）
| 命令 | 描述 |
|------|------|
| `cd server && npm run dev` | 在 localhost:1111 启动 Express 服务器 |
| `cd server && npm run build` | 编译 TypeScript |
| `cd server && npm start` | 运行编译后的 Node.js 服务器 |
| `cd server && npm run db:seed` | 使用 Prisma 填充数据库 |

### 运行测试
```bash
# 运行所有测试
npm run test

# 运行特定的测试文件
npx playwright test tests/e2e/sanity.spec.ts

# 运行单个测试
npx playwright test tests/e2e/sanity.spec.ts -t "Sanity Check"

# 以有头模式运行（可看到浏览器）
npx playwright test --headed

# 以调试模式运行
npx playwright test --debug
```

## 代码风格指南

### TypeScript
- **严格模式**：在 tsconfig.json 中启用
- **类型优先于接口**：联合类型使用 `type`，对象形状使用 `interface`
- **避免使用 `any`**：使用 `unknown` 或明确类型；仅在必要时进行类型转换
- **导出类型**：所有 TypeScript 类型/接口都应导出

### 命名规范
| 风格 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `generateOutline`, `userPoints` |
| 常量 | UPPER_SNAKE_CASE | `TOKEN_KEY`, `MAX_RETRY` |
| 类型/接口 | PascalCase | `User`, `ProjectSession` |
| 文件名 | camelCase | `auth.ts`, `geminiService.ts` |
| 组件文件 | PascalCase | `AuthFlow.tsx` |

### 导入
- 使用 `@/` 别名的绝对导入（在 tsconfig.json 和 vite.config.ts 中配置）
- 示例：`import { client } from '@/api/client'`
- 分组导入：外部 → 内部 → 相对路径

### 格式化
- **缩进**：4 个空格（参考现有代码如 `src/api/auth.ts`）
- **换行符**：Unix 风格（LF）
- **最大行长度**：120 个字符
- **分号**：必需

### 错误处理
```typescript
// 优先使用带日志记录的 try/catch
async function fetchData(): Promise<Data> {
    try {
        const response = await client.post('/api/endpoint');
        return response.data;
    } catch (error) {
        console.error("Fetch Data Error:", error);
        throw error; // 重新抛出以供调用者处理
    }
}

// API 函数抛出带有描述性消息的错误
throw new Error(result.error?.message || 'Operation failed');
```

### API 模式
- 使用来自 `@/api/client` 的 axios 客户端包装器
- 响应结构：`{ success: boolean, data: T, error?: { message: string } }`
- 使用 `TOKEN_KEY` 通过 `localStorage` 存储令牌

### React 组件
- 使用钩子的函数式组件
- 使用 TanStack Query（`@tanstack/react-query`）进行数据获取
- 使用 Tailwind CSS 进行样式设计（使用 `tailwind-merge` 合并类）
- 使用 Lucide React 图标

### CSS/样式
- Tailwind CSS v4
- 使用 `clsx` 或 `tailwind-merge` 进行条件类合并
- 示例：`cn('base-class', isActive && 'active-class')`

### 文件组织
```
src/
  ├── api/          → API 客户端和端点
  ├── components/   → React 组件
  ├── services/     → 业务逻辑（AI 服务）
  ├── types.ts      → 全局 TypeScript 类型
  ├── utils/        → 工具函数
  └── constants.ts  → 常量
```

### 测试
- 将端到端测试放在 `tests/e2e/` 目录下，后缀为 `.spec.ts`
- 使用 Playwright 的 `test` 和 `expect`
- 遵循模式：`test.describe`，`test.beforeEach`，单个 `test` 用例

## 环境变量
需要配置在 `.env`（不提交到版本控制）：
- `GEMINI_API_KEY` - Google Gemini API 密钥
- 后端特定变量在 `/server/.env` 中配置，包括数据库、JWT 等

## 常见任务

### 添加新的 API 端点
1. 在适当的 `src/api/*.ts` 文件中创建函数
2. 导出类型安全的响应
3. 使用 `@/api/client` 发送请求

### 添加新类型
1. 在 `src/types.ts` 中添加，使用 `export interface/type`
2. 使用 `@/types` 在需要的地方导入

### 同时运行前端和后端
```bash
# 终端 1 - 后端
cd server && npm run dev

# 终端 2 - 前端
npm run dev
```

## Git 工作流
- 功能分支：`feature/*` 或 `feat/*`
- Bug 修复：`fix/*`
- 提交信息：英文，祈使语气
- 主分支需要 Pull Request
