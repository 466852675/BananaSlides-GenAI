# AGENTS.md - BananaSlides-GenAI

> 本文档为 AI 智能体和开发人员提供项目开发规范和指南。

---

## 一、项目概述

### 1.1 项目简介
BananaSlides-GenAI 是一个基于 AI 的 PPT 智能生成平台，采用前后端分离架构：
- **前端**：React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **后端**：Express 5 + TypeScript + Prisma ORM + PostgreSQL
- **测试**：Playwright E2E 测试
- **AI 集成**：支持 Google Gemini、OpenAI、智谱 AI、硅基流动、火山引擎等多种模型

### 1.2 技术栈详情

| 层级 | 技术 | 版本要求 |
|------|------|----------|
| 前端框架 | React | ^19.2.3 |
| 构建工具 | Vite | ^6.2.0 |
| 语言 | TypeScript | ~5.8.2 |
| 样式 | Tailwind CSS | ^4.1.18 |
| 状态管理 | TanStack Query | ^5.90.16 |
| HTTP 客户端 | Axios | ^1.13.2 |
| 图标 | Lucide React | ^0.562.0 |
| 动画 | Framer Motion | ^12.26.2 |
| PDF 导出 | jsPDF | ^2.5.1 |
| PPT 导出 | PptxGenJS | ^3.12.0 |

### 1.3 项目结构

```
BananaSlides-GenAI/
├── src/                          # 前端源代码根目录
│   ├── api/                      # API 客户端和请求函数
│   │   ├── auth.ts              # 认证相关 API（登录、注册、登出等）
│   │   ├── client.ts            # Axios 实例和拦截器配置
│   │   ├── projects.ts          # 项目管理 API
│   │   ├── templates.ts         # 模板相关 API
│   │   ├── history.ts           # 历史记录 API
│   │   ├── favorites.ts         # 收藏相关 API
│   │   ├── admin.ts             # 管理员 API
│   │   ├── settings.ts          # 设置 API
│   │   └── points.ts            # 积分相关 API
│   │
│   ├── components/              # React 组件
│   │   ├── auth/                # 认证相关组件
│   │   │   ├── LoginPage.tsx
│   │   │   ├── LoginModal.tsx
│   │   │   └── UserWidget.tsx
│   │   ├── admin/               # 管理员组件
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── RoleManagement.tsx
│   │   │   ├── OrderManagement.tsx
│   │   │   ├── PointsRuleEditor.tsx
│   │   │   ├── SystemSettings.tsx
│   │   │   ├── SystemStats.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   └── AdminHeader.tsx
│   │   ├── user/                # 用户相关组件
│   │   │   ├── ProfileCenter.tsx
│   │   │   └── PointsHistory.tsx
│   │   ├── Dashboard.tsx        # 项目仪表板
│   │   ├── OutlineGenerator.tsx # 大纲生成器
│   │   ├── StyleControls.tsx    # 样式控制
│   │   ├── StyleTemplateManager.tsx  # 模板管理
│   │   ├── StyleTemplateEditor.tsx   # 模板编辑器
│   │   ├── ImageUploader.tsx    # 图片上传器
│   │   ├── GlobalSettingsModal.tsx   # 全局设置弹窗
│   │   ├── CreateProjectModal.tsx    # 创建项目弹窗
│   │   ├── StartProjectModal.tsx     # 开始项目弹窗
│   │   └── ...                  # 其他 UI 组件
│   │
│   ├── services/                # 业务逻辑服务层
│   │   ├── geminiService.ts     # Google Gemini AI 服务
│   │   └── exportService.ts     # 导出服务
│   │
│   ├── utils/                   # 工具函数
│   │   ├── auth.ts              # 认证工具函数
│   │   ├── fileParser.ts        # 文件解析工具
│   │   ├── resourceHelper.ts    # 资源助手
│   │   └── idFormatter.ts       # ID 格式化
│   │
│   ├── constants.ts             # 常量定义
│   ├── types.ts                 # 全局 TypeScript 类型定义
│   └── utils.ts                 # 通用工具函数
│
├── server/                      # 后端服务
│   ├── src/
│   │   ├── controllers/         # 控制器层
│   │   │   ├── auth.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── template.controller.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── ...
│   │   ├── services/            # 服务层
│   │   │   ├── auth.service.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── project.service.ts
│   │   │   ├── template.service.ts
│   │   │   └── ...
│   │   ├── routes/              # 路由定义
│   │   ├── middlewares/         # 中间件
│   │   ├── utils/               # 后端工具
│   │   └── app.ts               # 应用入口
│   ├── prisma/
│   │   ├── schema.prisma        # 数据库模型
│   │   └── seed.ts              # 数据库种子数据
│   └── package.json
│
├── tests/e2e/                   # Playwright 端到端测试
│   ├── sanity.spec.ts
│   └── admin_flow.spec.ts
│
├── package.json                 # 前端依赖配置
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # 前端 TypeScript 配置
├── playwright.config.ts        # Playwright 配置
└── .env                        # 环境变量（不提交）
```

---

## 二、开发环境配置

### 2.1 环境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **数据库**: PostgreSQL 14+

### 2.2 环境变量配置

#### 前端 `.env`
```bash
# AI API 密钥配置
GEMINI_API_KEY=your_gemini_api_key

# 注意：其他 API 密钥通过前端设置界面动态配置
# 支持的 AI 提供商：OpenAI、Google Gemini、智谱 AI、硅基流动、火山引擎等
```

#### 后端 `/server/.env`
```bash
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/bananaslides?schema=public"

# JWT 配置
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=1111
NODE_ENV=development

# 邮件服务配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# 其他服务配置
# ...
```

---

## 三、构建、测试和部署命令

### 3.1 前端命令（根目录）

```bash
# 启动开发服务器（默认端口 1000）
npm run dev

# 构建生产版本（输出到 dist/ 目录）
npm run build

# 预览生产构建
npm run preview

# 运行 Playwright E2E 测试
npm run test

# 安装依赖
npm install

# 添加依赖
npm install <package-name>
```

### 3.2 后端命令（/server 目录）

```bash
# 启动开发服务器（默认端口 1111）
cd server && npm run dev

# 编译 TypeScript（输出到 dist/ 目录）
cd server && npm run build

# 运行编译后的生产版本
cd server && npm start

# 数据库迁移
cd server && npx prisma migrate dev

# 数据库种子填充
cd server && npm run db:seed

# 查看 Prisma Studio（数据库可视化界面）
cd server && npx prisma studio

# 安装依赖
cd server && npm install
```

### 3.3 Playwright 测试命令

```bash
# 运行所有测试
npm run test

# 运行特定的测试文件
npx playwright test tests/e2e/sanity.spec.ts

# 运行单个测试用例
npx playwright test tests/e2e/sanity.spec.ts -t "Sanity Check"

# 以有头模式运行测试（可看到浏览器窗口）
npx playwright test --headed

# 以调试模式运行测试
npx playwright test --debug

# 生成测试报告
npx playwright test --reporter=html

# 运行特定项目的测试（配置在 playwright.config.ts 中）
npx playwright test --project=chromium

# 检查测试覆盖率
npx playwright test --coverage
```

---

## 四、代码风格规范

### 4.1 TypeScript 规范

#### 4.1.1 严格模式
所有 TypeScript 文件必须在 `tsconfig.json` 中启用严格模式检查。

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

#### 4.1.2 类型 vs 接口
- **使用 `type` 的场景**：
  - 联合类型
  - 交叉类型
  - 元组类型
  - 映射类型
  - 泛型别名

- **使用 `interface` 的场景**：
  - 对象形状定义
  - 类实现协议
  - 声明合并

```typescript
// 推荐：使用 type 定义联合类型
export type ProjectStatus = 'idle' | 'in-progress' | 'generating' | 'paused' | 'completed' | 'error';

// 推荐：使用 interface 定义对象形状
export interface User {
    id: string;
    email: string | null;
    username: string | null;
    nickname: string | null;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    status: 'ACTIVE' | 'DISABLED' | 'PENDING';
    points: number;
    createdAt: string;
}

// 推荐：导出所有类型
export interface ProjectSession {
    id: string;
    title: string;
    status: ProjectStatus;
    items: GeneratedSlide[];
}
```

#### 4.1.3 避免使用 `any`
严格禁止使用 `any` 类型，除非在以下极端情况：
- 外部库类型声明不完整
- 快速原型开发（后续必须补充类型）
- 与完全不可控的第三方代码交互

```typescript
// 禁止：使用 any
function fetchData(data: any): any {
    return data;
}

// 推荐：使用 unknown 和类型守卫
async function fetchData<T>(url: string): Promise<T> {
    const response = await client.get<T>(url);
    if (!response.data) {
        throw new Error('No data returned');
    }
    return response.data;
}

// 推荐：必要时的类型断言（明确标识）
const result = await client.post('/api/data') as { success: boolean; data: User };
```

#### 4.1.4 泛型使用
为可复用的函数和组件使用泛型：

```typescript
// 推荐：使用泛型
export async function createResource<T>(data: T): Promise<T> {
    const response = await client.post<T>('/api/resources', data);
    return response.data;
}

// 推荐：为 API 响应定义泛型
interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: { message: string };
}

function useApiQuery<T>(key: string[], queryFn: () => Promise<T>) {
    return useQuery({
        queryKey: key,
        queryFn
    });
}
```

### 4.2 命名规范

#### 4.2.1 统一命名表

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| 变量 | camelCase | `userPoints`, `isLoading` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `TOKEN_KEY` |
| 函数 | camelCase | `getUserData`, `formatDate` |
| 类 | PascalCase | `UserController`, `ProjectService` |
| 接口 | PascalCase | `User`, `ProjectSession` |
| 类型别名 | PascalCase | `UserRole`, `ProjectStatus` |
| 枚举 | PascalCase | `OrderStatus`, `UserRole` |
| 文件名 | camelCase | `auth.ts`, `geminiService.ts` |
| 组件文件 | PascalCase | `Dashboard.tsx`, `UserWidget.tsx` |
| 目录名 | camelCase | `src/components/admin/` |

#### 4.2.2 变量命名准则
```typescript
// 推荐：使用描述性的变量名
const userAuthenticationToken = 'xxx';
const isProjectInProgress = true;
const maximumRetryAttempts = 3;

// 避免：缩写和不明确的命名
const u = 'xxx';
const flag = true;
const max = 3;
```

#### 4.2.3 常量定义
```typescript
// 推荐：将常量集中定义在 constants.ts
export const TOKEN_KEY = 'bananaslides_token';
export const MAX_RETRY = 3;
export const API_TIMEOUT = 300000; // 5分钟

// 推荐：相关常量可以分组
export const STYLE_PRESETS = ["极简科技", "商务严谨", "时尚杂志", "扁平插画", "复古风"] as const;
export const COLOR_PRESETS = ["经典蓝白", "黑金奢华", "活力橙灰", "莫兰迪色系", "极简黑白"] as const;
export const RATIO_PRESETS = ["16:9", "4:3", "1:1"] as const;
```

#### 4.2.4 布尔值命名
```typescript
// 推荐：使用 is/are/has 前缀
const isLoading = true;
const hasError = false;
const areAllItemsSelected = true;

// 推荐：使用 should/will 前缀表示意图
const shouldAutoSave = true;
const willShowModal = false;
```

#### 4.2.5 回调函数命名
```typescript
// 推荐：事件处理函数使用 handle/on 前缀
const handleClick = () => {};
const onSubmit = (data: FormData) => {};
const handleInputChange = (value: string) => {};
const onNavigateTo = (path: string) => {};
```

### 4.3 导入规范

#### 4.3.1 使用路径别名
项目配置了 `@/` 别名指向 `src/` 目录，所有内部导入应使用此别名：

```typescript
// 推荐：使用路径别名
import { client, TOKEN_KEY } from '@/api/client';
import { User, ProjectSession } from '@/types';
import { formatDate } from '@/utils/dateFormatter';
import { Dashboard } from '@/components/Dashboard';

// 避免：使用相对路径
import { client } from '../../api/client';
```

#### 4.3.2 导入分组排序
按以下顺序分组导入，每组之间空一行：

1. **Node.js 内置模块**
2. **第三方 NPM 包**
3. **路径别名导入（@/）**
4. **相对路径导入（./ 或 ../）**

```typescript
// 推荐：按顺序分组导入
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';

import {
  Rocket,
  Clock,
  BarChart3,
  Zap,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';

import { ProjectSession, ProjectStatus, StyleConfig } from '../types';
import { STYLE_PRESETS, COLOR_PRESETS } from '../constants';
import { uploadFile, client } from '../api/client';
```

#### 4.3.3 导出模式
```typescript
// 推荐：命名导出（推荐）
export interface User {
    id: string;
    name: string;
}

export function getUser(id: string): User {
    return { id, name: 'User' };
}

// 推荐：组件默认导出
export const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
    return <div>{projects.length}</div>;
};

// 避免：混用默认导出和命名导出
export default class UserService { }
export class UserHelper { }  // 混乱
```

### 4.4 格式化规范

#### 4.4.1 基础格式规则
| 规则 | 规范 |
|------|------|
| **缩进** | 4 个空格（不使用 Tab） |
| **换行符** | Unix 风格（LF） |
| **最大行长度** | 120 字符 |
| **分号** | 必须使用 |
| **引号** | 字符串使用单引号 `'` |
| **对象括号** | 尾随逗号允许并推荐 |

#### 4.4.2 代码示例
```typescript
// 推荐：符合规范的代码格式
function calculateTotal(items: CartItem[]): number {
    const total = items.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);
    
    return total;
}

// 推荐：对象定义使用尾随逗号
const user = {
    id: '123',
    name: 'John',
    email: 'john@example.com',
};

// 推荐：长参数列表换行
function createProject(
    title: string,
    description: string,
    template: string,
    config: ProjectConfig
): Project {
    return {
        id: crypto.randomUUID(),
        title,
        description,
        template,
        config,
    };
}
```

#### 4.4.3 函数和方法的编写
```typescript
// 推荐：函数式组件定义
interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
}) => {
    const baseClass = 'px-4 py-2 rounded-lg font-medium transition-all';
    const variantClass = variant === 'primary'
        ? 'bg-blue-600 text-white hover:bg-blue-700'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    
    return (
        <button
            className={`${baseClass} ${variantClass}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
```

### 4.5 错误处理规范

#### 4.5.1 前端错误处理模式
```typescript
// 推荐：使用 try/catch 并记录错误日志
async function fetchUserData(userId: string): Promise<User> {
    try {
        const response = await client.get<User>(`/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Fetch User Error:', error);
        throw error; // 重新抛出以供调用者处理
    }
}

// 推荐：API 函数抛出描述性错误
export async function login(credentials: LoginData): Promise<AuthResult> {
    const result = await client.post<AuthResponse>('/auth/login', credentials) as any;

    if (result.success && result.data) {
        localStorage.setItem(TOKEN_KEY, result.data.token);
        return result.data;
    }

    throw new Error(result.error?.message || '登录失败');
}

// 推荐：处理不同类型的错误
async function handleApiError(error: unknown): Promise<void> {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        
        switch (status) {
            case 401:
                // 处理未授权：清除 token 并触发登出
                localStorage.removeItem(TOKEN_KEY);
                window.dispatchEvent(new CustomEvent('auth:logout'));
                showToast('登录已过期，请重新登录', 'error');
                break;
            case 403:
                showToast('权限不足', 'error');
                break;
            case 422:
                showToast(error.response?.data?.message || '参数错误', 'warning');
                break;
            case 500:
                showToast('服务器错误，请稍后重试', 'error');
                break;
            default:
                showToast('操作失败，请稍后重试', 'error');
        }
    }
}
```

#### 4.5.2 Axios 拦截器配置
```typescript
// src/api/client.ts
import axios from 'axios';

export const TOKEN_KEY = 'bananaslides_token';

export const client = axios.create({
    baseURL: '/api',
    timeout: 300000, // 5分钟超时（AI生成可能较慢）
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器：自动附加 Token
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
client.interceptors.response.use(
    (response) => response.data,
    (error) => {
        let message = error.response?.data?.error?.message 
            || error.response?.data?.error 
            || error.message;

        // 处理 401 未授权
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.dispatchEvent(new CustomEvent('auth:logout'));
            message = error.response?.data?.error?.message || '登录已过期，请重新登录';
        }

        // 处理 403 权限不足
        if (error.response?.status === 403) {
            message = error.response?.data?.error?.message || '权限不足';
        }

        // 处理 502/504 网关错误
        if (error.response?.status === 502) {
            message = 'AI服务网关响应失败 (502)。请检查全局设置中的 Base URL 是否正确。';
        } else if (error.response?.status === 504) {
            message = 'AI服务响应超时 (504)。生成图片可能比较耗时，请稍后重试。';
        } else if (error.message.includes('Network Error')) {
            message = '网络连接失败。请确保后端服务 (Port 1111) 已启动。';
        }

        console.error('API Error:', message);
        return Promise.reject(new Error(message));
    }
);
```

#### 4.5.3 文件上传错误处理
```typescript
export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const result = await client.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }) as unknown as any;

        // 处理新格式：{ url: "..." }
        if (result && typeof result.url === 'string') {
            return result.url;
        }

        // 处理旧格式：{ success: true, data: { url: "..." } }
        if (result && result.data && typeof result.data.url === 'string') {
            return result.data.url;
        }

        // 处理字符串格式
        if (typeof result === 'string') {
            return result;
        }

        throw new Error('Upload failed: invalid response format');
    } catch (error) {
        console.error('[uploadFile] Upload Error:', error);
        throw new Error('文件上传失败，请重试');
    }
};
```

### 4.6 React 组件开发规范

#### 4.6.1 函数式组件
```typescript
// 推荐：使用 React.FC 类型定义组件
interface DashboardProps {
    projects: ProjectSession[];
    onCreateProject: () => void;
    onOpenProject: (id: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onOpenSmartGenerate?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    projects,
    onCreateProject,
    onOpenProject,
    searchQuery,
    setSearchQuery,
    onOpenSmartGenerate,
}) => {
    // 组件逻辑
    return (
        <div className="flex-1 bg-[#f8fafc]">
            {/* JSX 内容 */}
        </div>
    );
};
```

#### 4.6.2 Hooks 使用规则
```typescript
// 推荐：使用 useMemo 缓存计算结果
const filteredProjects = useMemo(() => {
    return projects
        .filter(p => p.status !== 'completed')
        .filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => b.lastModified - a.lastModified);
}, [projects, searchQuery, statusFilter]);

// 推荐：使用 useCallback 缓存回调函数
const handleProjectClick = useCallback((projectId: string) => {
    onOpenProject(projectId);
}, [onOpenProject]);

// 推荐：正确使用 useEffect 的清理函数
useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, []);

// 推荐：依赖数组要完整
useEffect(() => {
    const subscription = observeProjectChanges(projectId);
    return () => subscription.unsubscribe();
}, [projectId]);
```

#### 4.6.3 TanStack Query 数据获取
```typescript
// 推荐：使用 useQuery 获取数据
const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 30 * 60 * 1000,   // 缓存30分钟
    retry: 3,
});

// 推荐：使用 useMutation 提交数据
const loginMutation = useMutation({
    mutationFn: (credentials: LoginData) => login(credentials),
    onSuccess: (data) => {
        localStorage.setItem(TOKEN_KEY, data.token);
        queryClient.setQueryData(['currentUser'], data.user);
        navigate('/dashboard');
    },
    onError: (error: Error) => {
        showToast(error.message, 'error');
    },
});

// 使用
const handleSubmit = () => {
    loginMutation.mutate({ identity, password });
};
```

#### 4.6.4 Tailwind CSS 样式规范
```typescript
import { cn } from '@/utils/cn'; // 使用 tailwind-merge 的工具函数

// 推荐：使用 tailwind-merge 合并类
const buttonClass = cn(
    'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold',
    'transition-all active:scale-95',
    variant === 'primary'
        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
);

// 推荐：使用条件类
<div className={cn(
    'p-4 rounded-lg border',
    isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
)}>
    Content
</div>

// 推荐：使用动画类
<div className="animate-pulse hover:animate-none transition-all duration-300">
    Loading...
</div>
```

#### 4.6.5 组件文件结构
```typescript
// src/components/Dashboard.tsx

// 1. 导入部分（分组排序）
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Rocket,
    Clock,
    BarChart3,
    Zap,
    Search,
    Filter,
    ArrowUpDown,
    MoreVertical,
    Play,
    Pause
} from 'lucide-react';

import { ProjectSession, ProjectStatus, StyleConfig } from '../types';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from '../constants';

// 2. 子组件定义（如果需要）
const CascadingFilter: React.FC<FilterProps> = ({ label, value, options, onChange }) => {
    // ...
};

// 3. 主组件
interface DashboardProps {
    projects: ProjectSession[];
    onCreateProject: () => void;
    onOpenProject: (id: string) => void;
    // ...
}

export const Dashboard: React.FC<DashboardProps> = ({
    projects,
    onCreateProject,
    onOpenProject,
    // ...
}) => {
    // hooks
    const [filter, setFilter] = useState('');

    // 计算属性
    const filteredProjects = useMemo(() => {
        // ...
    }, [projects, filter]);

    // 事件处理
    const handleCreate = useCallback(() => {
        onCreateProject();
    }, [onCreateProject]);

    // JSX
    return (
        <div className="dashboard">
            {/* 内容 */}
        </div>
    );
};

// 4. 辅助组件定义（放在文件末尾）
const ProjectCard: React.FC<{ project: ProjectSession }> = ({ project }) => {
    return (
        <div className="project-card">
            {/* 卡片内容 */}
        </div>
    );
};
```

### 4.7 后端 TypeScript 规范

#### 4.7.1 后端 TypeScript 配置
```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### 4.7.2 控制器模式
```typescript
// server/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const loginSchema = z.object({
    identity: z.string().min(1, '用户名/邮箱不能为空'),
    password: z.string().min(6, '密码至少6个字符'),
});

export const authController = {
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            // 参数验证
            const validatedData = loginSchema.parse(req.body);

            // 调用服务
            const result = await authService.login(validatedData);

            // 返回响应
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.register(req.body);
            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const user = await authService.getUserById(userId);
            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    },
};
```

#### 4.7.3 服务层模式
```typescript
// server/src/services/auth.service.ts
import { prisma } from '../utils/prisma';
import { bcrypt } from '../utils/password.util';
import { jwtUtil } from '../utils/jwt.util';
import { logger } from '../utils/logger';

export const authService = {
    async login(data: { identity: string; password: string }) {
        try {
            // 查找用户
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: data.identity },
                        { username: data.identity },
                    ],
                },
            });

            if (!user) {
                throw new Error('用户不存在');
            }

            // 验证密码
            const isValid = await bcrypt.compare(data.password, user.password);
            if (!isValid) {
                throw new Error('密码错误');
            }

            // 检查状态
            if (user.status !== 'ACTIVE') {
                throw new Error('账户已被禁用');
            }

            // 生成 Token
            const token = jwtUtil.generate({ userId: user.id, role: user.role });

            logger.info(`User ${user.id} logged in successfully`);

            return {
                user,
                token,
                expiresIn: 7 * 24 * 60 * 60, // 7天
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    },

    async register(data: RegisterData) {
        // 注册逻辑
        // ...
    },
};
```

#### 4.7.4 路由定义
```typescript
// server/src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateMiddleware } from '../middlewares/validateMiddleware';

const router = Router();

// 公开路由
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// 需要认证的路由
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);
router.put('/me', authMiddleware.verifyToken, authController.updateProfile);
router.post('/change-password', authMiddleware.verifyToken, authController.changePassword);

export default router;
```

#### 4.7.5 中间件模式
```typescript
// server/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { jwtUtil } from '../utils/jwt.util';
import { prisma } from '../utils/prisma';

export const authMiddleware = {
    verifyToken(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: { message: '未提供认证令牌' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwtUtil.verify(token);
            
            (req as any).user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: { message: '无效或过期的令牌' }
            });
        }
    },

    requireRole(...roles: string[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = (req as any).user;
            
            if (!user || !roles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: { message: '权限不足' }
                });
            }
            
            next();
        };
    },
};
```

---

## 五、全局类型定义

### 5.1 核心类型文件

```typescript
// src/types.ts

// ==================== 资源类型 ====================
export type StoredResource = File | string;

// ==================== 页面结构 ====================
export interface PageStructure {
    cover: number;          // 封面页数量
    directory: number;      // 目录页数量
    transition: number;     // 过渡页数量
    content: number;        // 内容页数量
    end: number;            // 结束页数量
}

// ==================== 样式配置 ====================
export interface StyleConfig {
    styleName: string;
    colorPalette: string;
    requirements: string;
    aspectRatio: string;
    targetPageCount: number;           // 目标页面数量
    defaultVariantCount: number;       // 默认变体数量
    pageStructure: PageStructure;      // 页面结构
}

// ==================== 页面类型 ====================
export type PageType = 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';

// ==================== 全局样式映射 ====================
export type GlobalStyleMap = Record<PageType, StoredResource | null>;

// ==================== 生成的幻灯片 ====================
export interface GeneratedSlide {
    id: string;
    contentType: 'image' | 'text';
    pageType: PageType;
    originalFile: StoredResource | null;
    title?: string;
    textContent?: string;
    previewUrl: string;
    variants: string[];
    variantCount: number;
    status: 'idle' | 'generating' | 'success' | 'error';
    errorMessage?: string;
    createdAt: number;
}

// ==================== 大纲项 ====================
export interface OutlineItem {
    id: string;
    index: number;
    title: string;
    brief: string;
    fullContent?: string;
    pageType: PageType;
    status: 'idle' | 'generating' | 'success' | 'error';
}

// ==================== 项目会话 ====================
export type ProjectStatus = 'idle' | 'in-progress' | 'generating' | 'paused' | 'completed' | 'error';
export type ScenarioType = 'ACADEMIC' | 'BUSINESS' | 'CREATIVE';

export interface ProjectSession {
    id: string;
    title: string;
    displayId?: string;
    scenarioType?: ScenarioType;
    lastModified: number;
    createdAt: number;
    status: ProjectStatus;
    isPinned?: boolean;
    styleTemplateId?: string;
    methods: string[];
    progress: number;
    items: GeneratedSlide[];
    globalConfig: StyleConfig;
    globalStyleMap?: GlobalStyleMap;
    thumbnailUrl?: string;
    completedAt?: number;
}

// ==================== 样式模板 ====================
export interface StyleTemplate {
    id: string;
    name: string;
    config: StyleConfig;
    styleMap?: GlobalStyleMap;
    isCustom: boolean;
    createdAt: number;
    isOfficial?: boolean;
    isRecommended?: boolean;
    usageCount?: number;
    updatedAt?: number;
}

// ==================== 样式预设 ====================
export interface StylePreset {
    id: string;
    templateId?: string;
    name: string;
    config: StyleConfig;
    styleMap?: GlobalStyleMap;
    sampleImages?: string[];
    createdAt: number;
    templateCreatedAt?: number;
    templateUpdatedAt?: number;
}

// ==================== AI 设置类型 ====================
export type AIProvider = 'OpenAI' | 'Gemini' | 'Zhipu' | 'SiliconFlow' | 'ModelScope' | 'Volcengine' | 'Custom' | 'CustomCombo';
export type ImageResolution = '1024x1024' | '2048x2048' | '4096x4096' | '1280x720' | '1920x1080' | '3840x2160';
export type OutputLanguage = 'zh' | 'ja' | 'en' | 'auto';

export interface ModelConnection {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface CustomComboConfig {
    text: ModelConnection;
    image: ModelConnection;
    vision: ModelConnection;
}

export interface DocParserConfig {
    provider: 'MinerU' | 'None';
    baseUrl: string;
    apiKey: string;
}

export interface EnvPreset {
    baseUrl: string;
    models: {
        text: string;
        image: string;
        vision: string;
    };
}

export interface AppSettings {
    ai: {
        provider: AIProvider;
        baseUrl: string;
        apiKey: string;
        models: {
            text: string;
            image: string;
            vision: string;
        };
        customCombo?: CustomComboConfig;
    };
    docParser: DocParserConfig;
    imageGeneration: {
        resolution: ImageResolution;
    };
    performance: {
        textConcurrency?: number;
        imageConcurrency?: number;
    };
    language: OutputLanguage;
    envPresets?: Record<string, EnvPreset>;
}
```

---

## 六、Git 工作流规范

### 6.1 分支命名规则
| 分支类型 | 前缀 | 示例 |
|----------|------|------|
| 功能分支 | `feature/` | `feature/user-authentication` |
| Bug 修复 | `fix/` | `fix/login-redirect-issue` |
| 热修复 | `hotfix/` | `hotfix/critical-security-patch` |
| 发布分支 | `release/` | `release/v1.0.0` |
| 实验分支 | `dev/` | `dev/new-ai-provider` |

### 6.2 提交信息规范
使用 **Conventional Commits** 格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### 提交类型
- **feat**: 新功能
- **fix**: Bug 修复
- **docs**: 文档更新
- **style**: 代码格式（不影响功能）
- **refactor**: 重构
- **perf**: 性能优化
- **test**: 添加/修改测试
- **chore**: 构建工具、辅助工具更新

#### 提交示例
```
feat(auth): 添加手机号登录功能

- 实现手机号验证码登录
- 添加登录成功后自动跳转

Closes #123
```

```
fix(api): 修复文件上传超时问题

- 增加超时时间为5分钟
- 添加重试机制
```

### 6.3 Pull Request 规范
- 所有 PR 必须通过 CI 检查
- 需要至少 1 人 Code Review
- 保持 PR 专注于单一功能
- PR 描述应包含：改动内容、测试情况、截图（如涉及 UI）

---

## 七、常见任务指南

### 7.1 添加新的 API 端点

**步骤 1**：在 `src/api/` 目录下创建新的 API 文件

```typescript
// src/api/analytics.ts
import { client } from './client';

export interface AnalyticsData {
    totalProjects: number;
    totalPages: number;
    completionRate: number;
}

export async function getAnalytics(startDate: string, endDate: string): Promise<AnalyticsData> {
    const result = await client.get<AnalyticsData>('/analytics', {
        params: { startDate, endDate }
    }) as any;

    if (result.success && result.data) {
        return result.data;
    }

    throw new Error(result.error?.message || '获取统计数据失败');
}
```

**步骤 2**：在需要的地方导入使用

```typescript
import { getAnalytics } from '@/api/analytics';

const { data: analytics } = useQuery({
    queryKey: ['analytics', startDate, endDate],
    queryFn: () => getAnalytics(startDate, endDate),
});
```

### 7.2 添加新类型

**步骤 1**：在 `src/types.ts` 中定义类型

```typescript
// src/types.ts

export interface Notification {
    id: string;
    userId: string;
    type: 'system' | 'project' | 'points';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export interface NotificationListResponse {
    notifications: Notification[];
    total: number;
    unreadCount: number;
}
```

**步骤 2**：在需要的地方导入

```typescript
import { Notification, NotificationListResponse } from '@/types';
```

### 7.3 添加新组件

```typescript
// src/components/NotificationList.tsx

import React, { useState, useCallback } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Notification } from '@/types';

interface NotificationListProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({
    notifications,
    onMarkAsRead,
    onDelete,
    onLoadMore,
    hasMore,
}) => {
    return (
        <div className="notification-list">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={cn(
                        'notification-item',
                        !notification.read && 'unread'
                    )}
                >
                    {/* 通知内容 */}
                </div>
            ))}
            
            {hasMore && (
                <button onClick={onLoadMore} className="load-more">
                    加载更多
                </button>
            )}
        </div>
    );
};
```

### 7.4 添加新服务（AI Service）

```typescript
// src/services/openaiService.ts

import { client } from '@/api/client';
import { AIProvider, ModelConnection } from '@/types';

export const openaiService = {
    async generateContent(
        prompt: string,
        model: string,
        options?: { temperature?: number; maxTokens?: number }
    ): Promise<string> {
        try {
            const response = await client.post<{ success: boolean; data: string }>('/ai/generate', {
                provider: 'OpenAI' as AIProvider,
                model,
                prompt,
                options,
            });
            return (response as any).data;
        } catch (error) {
            console.error('OpenAI Generate Error:', error);
            throw error;
        }
    },
};
```

### 7.5 修改全局设置

```typescript
// src/settings/GlobalSettingsManager.tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppSettings, AIProvider } from '@/types';
import { updateSettings } from '@/api/settings';

export function useSettings() {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => fetchSettings(),
        staleTime: 5 * 60 * 1000, // 5分钟
    });

    const updateMutation = useMutation({
        mutationFn: (newSettings: Partial<AppSettings>) => updateSettings(newSettings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });

    return {
        settings,
        isLoading,
        updateSettings: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    };
}
```

---

## 八、开发工具和调试

### 8.1 常用调试技巧

```typescript
// 推荐：使用 console.group 进行分组日志
function processProject(project: ProjectSession) {
    console.group(`Processing project: ${project.id}`);
    console.log('Project title:', project.title);
    console.log('Status:', project.status);
    console.log('Items count:', project.items.length);
    
    project.items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, item.title, item.status);
    });
    
    console.groupEnd();
}

// 推荐：使用 CSS 类名调试
<div className="debug-border debug-padding">
    {/* 组件内容 */}
</div>

// 推荐：使用 React DevTools
// 安装 React DevTools 浏览器扩展
```

### 8.2 网络调试
- 使用浏览器 DevTools Network 面板查看 API 请求
- 所有 API 请求通过 `/api` 代理到后端 `localhost:1111`
- 查看请求和响应格式：`{ success: boolean, data: T, error?: { message: string } }`

### 8.3 性能调试
```typescript
// 使用 React DevTools Profiler 分析组件渲染
// 使用 console.time 测量函数执行时间
function expensiveOperation() {
    console.time('expensiveOperation');
    // ... 计算逻辑
    console.timeEnd('expensiveOperation');
}

// 使用 Lighthouse 进行性能审计
// npm run build && npm run preview
// 然后访问 http://localhost:4173
```

---

## 九、注意事项和最佳实践

### 9.1 安全注意事项
- 禁止在客户端代码中硬编码 API 密钥
- 禁止将敏感信息提交到版本控制
- 推荐使用环境变量（`.env`）存储密钥
- 推荐在后端进行敏感数据处理
- 推荐对用户输入进行验证和清理

### 9.2 性能注意事项
- 推荐使用 `useMemo` 和 `useCallback` 避免不必要的重新计算
- 推荐使用 TanStack Query 进行数据缓存
- 推荐懒加载大型组件：`React.lazy(() => import('./HeavyComponent'))`
- 推荐使用虚拟列表处理大量数据

### 9.3 可访问性注意事项
- 推荐为交互元素添加 `aria-label`
- 推荐使用语义化 HTML 标签
- 推荐确保键盘导航可用
- 推荐保持足够的颜色对比度

### 9.4 国际化注意事项
- 推荐将显示文本提取到常量或翻译文件中
- 推荐使用数字和日期格式化函数
- 推荐避免硬编码中文文本在代码中

---

## 十、故障排除

### 10.1 常见问题

#### Q: 开发服务器无法启动
```bash
# 检查端口是否被占用
netstat -ano | findstr :1000

# 杀死占用端口的进程
taskkill /PID <PID> /F

# 清除缓存后重试
rm -rf node_modules/.vite
npm run dev
```

#### Q: 后端连接失败
```bash
# 确保后端在运行
cd server && npm run dev

# 检查数据库连接
cd server && npx prisma db push

# 查看后端日志
# 控制台会显示在 localhost:1111
```

#### Q: TypeScript 类型错误
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查 tsconfig.json 配置
cat tsconfig.json

# VSCode: 重启 TS 服务器
# Ctrl + Shift + P -> TypeScript: Restart TS Server
```

### 10.2 快速重启脚本
```bash
# Windows - 一键启动（已提供）
双击运行 "一键启动.bat"

# 或手动启动
# 终端 1 - 后端
cd server && npm run dev

# 终端 2 - 前端
npm run dev
```

---

**文档最后更新：2026年1月**
**维护者：BananaSlides 开发团队**
