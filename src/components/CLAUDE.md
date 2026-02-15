# 🧩 src/components - UI 组件库

[< 返回前端模块](../CLAUDE.md) | [< 返回根目录](../../CLAUDE.md)

---

## 概述

YH-AI PPT 的 UI 组件库，包含 100+ 个 React 组件，覆盖完整的 PPT 创作工作流和后台管理系统。

### 组件分类

- **admin/** - 后台管理组件 (20+)
- **auth/** - 认证相关组件
- **user/** - 用户端功能组件
- **根级** - 共享通用组件

---

## 目录结构

```
src/components/
├── admin/                      # 后台管理组件
│   ├── AdminDashboard.tsx     # 管理控制台
│   ├── AdminHeader.tsx        # 管理后台头部
│   ├── AdminLayout.tsx        # 管理后台布局
│   ├── AdminSidebar.tsx       # 管理侧边栏
│   ├── AICoreEngine.tsx       # AI 引擎配置
│   ├── GrowthCenter.tsx       # 增长中心
│   ├── GrowthStats.tsx        # 增长统计
│   ├── LeadManagement.tsx     # 线索管理
│   ├── OrderManagement.tsx    # 订单管理
│   ├── PasswordResetModal.tsx # 密码重置弹窗
│   ├── PointsRuleEditor.tsx   # 积分规则编辑
│   ├── ProductManagement.tsx  # 产品管理
│   ├── ReferralConfig.tsx     # 邀请配置
│   ├── RoleManagement.tsx     # 角色权限管理
│   ├── SystemSettings.tsx     # 系统设置
│   ├── SystemStats.tsx        # 系统统计
│   ├── UserManagement.tsx     # 用户管理
│   └── index.ts               # 导出聚合
├── auth/                       # 认证组件
│   ├── LoginForm.tsx          # 登录表单
│   ├── RegisterForm.tsx       # 注册表单
│   ├── UserWidget.tsx         # 用户小部件
│   └── ...
├── user/                       # 用户端组件
│   ├── Dashboard.tsx          # 主工作台 (52KB)
│   ├── ProjectEditor.tsx      # 项目编辑器
│   ├── TemplateGallery.tsx    # 模板库
│   └── ...
├── ConfirmDialog.tsx           # 确认对话框
├── LoadingSpinner.tsx          # 加载动画
└── ...
```

---

## 核心组件详解

### Admin 后台管理组件

#### AdminDashboard.tsx
**职责**: 管理控制台首页，展示系统概览数据
**功能**:
- 数据统计卡片 (用户数/订单数/收入)
- 近期活动时间线
- 快捷操作入口

#### UserManagement.tsx
**职责**: 用户生命周期管理
**功能**:
- 用户列表展示与搜索
- 用户状态管理 (启用/禁用)
- 用户详情查看与编辑
- 批量操作

#### OrderManagement.tsx
**职责**: 订单全生命周期管理
**功能**:
- 订单列表与筛选
- 订单状态流转
- 支付流水查看
- 退款处理

#### RoleManagement.tsx
**职责**: RBAC 权限控制
**功能**:
- 角色定义与配置
- 权限点分配
- 用户角色绑定

#### LeadManagement.tsx
**职责**: 销售线索管理
**功能**:
- 线索收集与分类
- 线索分配
- 跟进状态跟踪

#### SystemSettings.tsx
**职责**: 系统参数配置
**功能**:
- 全局参数设置
- 邮件/短信配置
- 存储配置

### User 用户端组件

#### Dashboard.tsx
**路径**: `src/components/user/Dashboard.tsx`
**体积**: ~52KB (项目最大组件之一)

**职责**: 用户主工作台，PPT 项目管理核心界面

**核心功能**:
- 项目卡片看板视图
- 项目状态筛选与搜索
- 快速创建新项目
- 近期活动展示
- 快捷操作入口

**⚠️ 注意事项**:
- 组件体积较大，编辑需谨慎
- 建议后续拆分为子组件
- 包含大量业务逻辑

#### ProjectEditor.tsx
**职责**: PPT 项目编辑器

**核心功能**:
- 幻灯片预览与编辑
- 大纲视图
- 图片生成与管理
- 导出设置
- 历史版本

#### TemplateGallery.tsx
**职责**: 模板库浏览

**核心功能**:
- 模板分类浏览
- 模板预览
- 模板收藏
- 快速应用

### Auth 认证组件

#### LoginForm.tsx
- 用户登录表单
- 支持邮箱/手机号登录
- 记住密码功能
- 表单验证

#### RegisterForm.tsx
- 用户注册表单
- 验证码验证
- 用户协议确认
- 表单验证

#### UserWidget.tsx
- 用户信息展示小部件
- 快捷菜单
- 积分/余额展示

---

## 组件开发规范

### 命名规范

- **文件**: PascalCase (如 `UserManagement.tsx`)
- **组件**: 与文件名一致
- **Props 接口**: `[组件名]Props` (如 `UserManagementProps`)
- **样式类**: Tailwind CSS 类名，使用 clsx/tailwind-merge 合并

### 组件模板

```tsx
import React, { useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 工具函数: 合并 Tailwind 类名
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Props 接口定义
export interface MyComponentProps {
  title: string;
  description?: string;
  onAction?: () => void;
  className?: string;
}

// 组件实现
export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  description,
  onAction,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = useCallback(async () => {
    if (!onAction) return;
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  }, [onAction]);

  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      )}
      {onAction && (
        <button
          onClick={handleAction}
          disabled={isLoading}
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '处理中...' : '执行操作'}
        </button>
      )}
    </div>
  );
};

export default MyComponent;
```

### 性能优化建议

1. **使用 React.memo 缓存纯展示组件**
2. **使用 useMemo 缓存计算结果**
3. **使用 useCallback 缓存回调函数**
4. **虚拟滚动处理长列表**
5. **图片懒加载**
6. **组件懒加载 (React.lazy)**

### 错误处理规范

```tsx
import { toast } from 'react-hot-toast';

const MyComponent = () => {
  const handleOperation = async () => {
    try {
      const result = await api.operation();
      toast.success('操作成功');
      return result;
    } catch (error) {
      // 统一错误处理
      const message = error instanceof Error ? error.message : '操作失败';
      toast.error(message);
      console.error('Operation failed:', error);
      throw error; // 继续抛出供上层处理
    }
  };

  return (
    // ...
  );
};
```

---

## 依赖说明

### 核心依赖

| 包名 | 版本 | 用途 |
|-----|------|------|
| react | ^19.2.3 | UI 框架 |
| react-dom | ^19.2.3 | DOM 渲染 |
| @tanstack/react-query | ^5.90.16 | 服务端状态管理 |
| axios | ^1.13.2 | HTTP 客户端 |

### UI 与样式

| 包名 | 版本 | 用途 |
|-----|------|------|
| tailwindcss | ^4.1.18 | 原子 CSS 框架 |
| clsx | ^2.1.1 | 类名条件合并 |
| tailwind-merge | ^3.4.0 | Tailwind 类名去重合并 |
| lucide-react | ^0.562.0 | 图标库 |
| framer-motion | ^12.26.2 | 动画库 |

### 工具库

| 包名 | 版本 | 用途 |
|-----|------|------|
| date-fns | ^4.1.0 | 日期处理 |
| react-hot-toast | ^2.6.0 | 消息提示 |
| file-saver | ^2.0.5 | 文件下载 |
| jspdf | 2.5.1 | PDF 生成 |
| pptxgenjs | 3.12.0 | PPT 生成 |
| jszip | 3.10.1 | ZIP 压缩 |

---

## 面包屑导航

**当前位置**: 根目录 > **src** (前端主模块)

**同级模块**:
- [server/](../server/CLAUDE.md) - 后端模块
- [docs/](../docs/) - 技术文档

**子模块**:
- [api/](./api/CLAUDE.md) - API 客户端层
- [components/](./components/CLAUDE.md) - UI 组件库

---

*最后更新: 2026-02-02*
