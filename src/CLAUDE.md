# 🎨 src - 前端主模块

[< 返回根目录](../CLAUDE.md)

---

## 概述

BananaSlides-GenAI 的前端主模块，基于 **React 19.2 + TypeScript 5.9 + Vite 6.2 + TailwindCSS v4.1** 构建。

### 核心职责

- **用户界面渲染**: 完整 PPT 创作工作流 UI
- **状态管理**: React Context + TanStack Query 组合
- **API 通信**: 封装后端接口调用
- **交互体验**: 胶囊导航、呼吸式反馈、级联过滤

---

## 目录结构

```
src/
├── api/                    # API 客户端层
│   ├── admin.ts           # 管理员接口
│   ├── auth.ts            # 认证接口
│   ├── client.ts          # 基础 HTTP 客户端
│   ├── projects.ts        # 项目接口
│   ├── templates.ts       # 模板接口
│   └── ...
├── components/            # UI 组件库 (100+ 组件)
│   ├── admin/             # 后台管理组件
│   ├── auth/              # 认证相关组件
│   ├── user/              # 用户端组件
│   └── [根级共享组件]
├── contexts/              # React Context
│   ├── AuthContext.tsx    # 认证上下文
│   └── SettingsContext.tsx # 设置上下文
├── hooks/                 # 自定义 React Hooks
├── pages/                 # 页面级组件
├── services/              # 前端业务服务
├── styles/                # 样式文件
├── types.ts               # 共享 TypeScript 类型
├── utils.ts               # 工具函数
├── constants.ts           # 常量定义
├── App.tsx                # 根组件 (221KB 主入口)
└── index.tsx              # 应用入口
```

---

## 关键文件详解

### App.tsx - 根组件

**路径**: `src/App.tsx`
**体积**: ~221KB (项目最大组件)

**职责**:
- 路由定义与配置
- 全局布局结构
- 主题配置
- 权限路由守卫

### API 客户端层

**路径**: `src/api/`

| 文件 | 职责 |
|-----|------|
| `client.ts` | Axios 实例配置、拦截器、错误处理 |
| `auth.ts` | 登录/注册/登出/Token 刷新 |
| `projects.ts` | 项目 CRUD、版本管理、归档 |
| `templates.ts` | 模板库、样式定义 |
| `admin.ts` | 用户管理、订单管理、系统配置 |
| `orders.ts` | 订单创建、支付、履约 |
| `points.ts` | 积分查询、消耗、充值 |
| `growth.ts` | 签到、邀请、任务系统 |

### 组件库结构

**路径**: `src/components/`

```
components/
├── admin/              # 后台管理 (20+ 组件)
│   ├── AdminDashboard.tsx
│   ├── UserManagement.tsx
│   ├── OrderManagement.tsx
│   ├── RoleManagement.tsx
│   └── ...
├── auth/               # 认证相关
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── UserWidget.tsx
├── user/               # 用户端功能
│   ├── Dashboard.tsx   # 主工作台 (52KB)
│   ├── ProjectEditor.tsx
│   └── TemplateGallery.tsx
└── [共享组件]
    ├── ConfirmDialog.tsx
    ├── LoadingSpinner.tsx
    └── ...
```

### 状态管理

**React Context 使用**:

```typescript
// AuthContext.tsx - 认证状态
const AuthContext = createContext<{
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}>(...);

// SettingsContext.tsx - 应用设置
const SettingsContext = createContext<{
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}>(...);
```

**TanStack Query 使用**:

```typescript
// 项目列表查询
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects', { status: 'active' }],
  queryFn: () => projectApi.getProjects({ status: 'active' }),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// 项目创建 mutation
const createProject = useMutation({
  mutationFn: projectApi.createProject,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    toast.success('项目创建成功');
  },
});
```

---

## 路由结构

```typescript
// App.tsx 路由配置
const routes = [
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/app',
    element: <ProtectedLayout />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'projects', element: <ProjectList /> },
      { path: 'projects/:id', element: <ProjectEditor /> },
      { path: 'templates', element: <TemplateGallery /> },
      { path: 'history', element: <HistoryArchive /> },
      { path: 'settings', element: <UserSettings /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminProtectedLayout />,
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'users', element: <UserManagement /> },
      { path: 'orders', element: <OrderManagement /> },
      { path: 'roles', element: <RoleManagement /> },
      { path: 'settings', element: <SystemSettings /> },
    ],
  },
];
```

---

## 常见开发任务

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `App.tsx` 添加路由配置
3. 在 `src/api/` 添加相关 API 调用

### 添加新组件

1. 在 `src/components/` 创建组件文件
2. 遵循组件命名规范 (PascalCase)
3. 导出到 `src/components/index.ts` (如需要)

### 添加新 API

1. 在 `src/api/` 创建或修改对应模块文件
2. 在 `client.ts` 中定义请求/响应类型
3. 在组件中使用 TanStack Query 进行数据获取

---

## 注意事项

### 大型组件警告

- `Dashboard.tsx` (~52KB) - 主工作台，包含大量业务逻辑
- `StyleTemplateManager.tsx` (~78KB) - 模板管理核心
- `LandingPageComp.tsx` (~67KB) - 落地页组件

编辑这些文件时需谨慎，建议使用代码分割或拆分为子组件。

### 性能优化建议

1. 图片使用懒加载
2. 大数据列表使用虚拟滚动
3. API 调用合理使用缓存策略
4. 组件按需加载 (React.lazy)

---

*最后更新: 2026-02-02*
