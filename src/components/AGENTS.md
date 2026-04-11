# UI 组件 - YH-AI PPT

**作用域：** `/src/components` — React 函数式组件 + Tailwind CSS

---

## 概述

34 个 React 组件实现 PPT 生成界面。按领域组织：admin、auth、user 及根级工作区组件。

## 结构

```
components/
├── admin/           # RBAC、订单、积分、用户管理（20 文件）
├── auth/            # 登录弹窗/页面（4 文件）
├── user/            # 用户资料/设置（3 文件）
├── sections/        # 落地页区块
└── *.tsx            # 根级工作区组件（Dashboard 等）
```

## 快速定位

| 需求 | 位置 | 说明 |
|------|------|------|
| 项目工作区 | `Dashboard.tsx` | 主界面 — 卡片、时间线、导出 |
| 管理面板 | `admin/*.tsx` | 用户/订单/积分管理 |
| 认证流程 | `auth/LoginModal.tsx` | JWT 登录弹窗 |
| 落地页 | `LandingPageComp.tsx` | 营销页面 |
| 大纲编辑器 | `OutlineGenerator.tsx` | AI 大纲生成 |
| 风格模板 | `StyleTemplateManager.tsx` | 视觉主题系统 |
| 结果展示 | `ResultCard.tsx` | 幻灯片预览/变体 |

## 约定

### 组件结构
- **PascalCase** 命名（`Dashboard.tsx`、`LoginModal.tsx`）
- 函数式组件 + Hooks，禁止类组件
- Props 接口内联定义或放在 `types.ts`

### 样式
- **Tailwind CSS v4.1** 原子化类
- **Framer Motion** 用于 AI 操作的"呼吸式"反馈动画
- **Lucide React** 图标库
- 毛玻璃效果：`backdrop-blur-md bg-white/80`

### 状态管理
- 本地状态：`useState`、`useReducer`
- 服务端状态：TanStack Query（React Query）hooks
- 认证上下文：`AuthContext.tsx` 管理用户会话

### 关键模式
- 弹窗组件接受 `isOpen`/`onClose` props
- Toast 通知通过 `react-hot-toast`
- 图片处理：始终使用 URL 字符串，禁止 File 对象

## 反模式

- **禁止**直接使用 `variants[0]` — 使用专用预览字段
- **禁止**存储 File 对象 — 立即转为 URL
- **禁止**在 PPT 标题/列表中使用中文标点（。！？）
- **禁止**在项目上下文中清空项目 ID
- **始终**使用 `syncSlidesMutation` 更新幻灯片，而非通用项目 mutation
