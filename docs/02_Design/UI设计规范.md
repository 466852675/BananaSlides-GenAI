---
title: YH-AI PPT UI设计规范
code_version: v2.0
last_updated: 2026-02-16
author: 设计团队
reviewer: 产品负责人
status: published
modules: [UI, 设计, 组件]
tags: [UI规范, 视觉设计, 组件库]
---

# YH-AI PPT UI设计规范

> **文档状态**: 已发布  
> **版本**: v2.0 (与PRD v2.0对齐)  
> **最后更新**: 2026-02-16

---

## 变更历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-02-16 | 设计团队 | 初始版本，定义UI设计规范 |

---

## 1. 设计原则

### 1.1 核心设计理念

**意图驱动的交互设计**：让用户专注于"想要什么"，而不是"如何做"。

### 1.2 设计原则

| 原则 | 说明 | 应用场景 |
|------|------|----------|
| **简洁性** | 减少认知负担，突出核心操作 | 页面布局、按钮设计 |
| **一致性** | 统一视觉语言和行为模式 | 组件复用、交互反馈 |
| **即时反馈** | 每个操作都有明确的状态反馈 | AI生成、加载状态 |
| **渐进式披露** | 复杂功能分层展示 | 新手引导、高级功能 |
| **容错性** | 预防错误，提供恢复机制 | 表单验证、撤销操作 |

---

## 2. 视觉规范

### 2.1 色彩系统

#### 2.1.1 主色调

| 用途 | 颜色名称 | Hex值 | 使用场景 |
|------|----------|-------|----------|
| 主色 | Deep Blue | #2563EB | 主要按钮、链接、选中态 |
| 主色悬停 | Deep Blue Hover | #1D4ED8 | 按钮悬停状态 |
| 主色浅色 | Light Blue | #DBEAFE | 背景、标签 |

#### 2.1.2 功能色

| 用途 | 颜色名称 | Hex值 | 使用场景 |
|------|----------|-------|----------|
| 成功 | Success Green | #10B981 | 成功状态、正确操作 |
| 警告 | Warning Amber | #F59E0B | 警告、注意事项 |
| 错误 | Error Red | #EF4444 | 错误提示、失败状态 |
| 信息 | Info Blue | #3B82F6 | 信息提示 |

#### 2.1.3 中性色

| 用途 | 颜色名称 | Hex值 |
|------|----------|-------|
| 文字主色 | Gray 900 | #111827 |
| 文字次要 | Gray 600 | #4B5563 |
| 文字禁用 | Gray 400 | #9CA3AF |
| 边框 | Gray 200 | #E5E7EB |
| 背景 | Gray 50 | #F9FAFB |
| 卡片背景 | White | #FFFFFF |

### 2.2 字体系统

#### 2.2.1 字体族

| 用途 | 字体 | 权重 |
|------|------|------|
| 中文正文 | Inter, system-ui, sans-serif | 400, 500, 600 |
| 中文标题 | Inter, system-ui, sans-serif | 600, 700 |
| 英文/数字 | Inter, system-ui, sans-serif | 400, 500, 600 |
| 代码 | JetBrains Mono, monospace | 400 |

#### 2.2.2 字号体系

| 用途 | 字号 | 行高 |
|------|------|------|
| H1 标题 | 32px / 2rem | 1.2 |
| H2 标题 | 24px / 1.5rem | 1.3 |
| H3 标题 | 20px / 1.25rem | 1.4 |
| 正文 | 14px / 0.875rem | 1.5 |
| 小字 | 12px / 0.75rem | 1.4 |
| 按钮 | 14px / 0.875rem | 1 |

### 2.3 间距系统

基于4px网格的间距体系：

| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 紧凑元素 |
| sm | 8px | 组件内部 |
| md | 16px | 组件间距 |
| lg | 24px | 区块间距 |
| xl | 32px | 页面边距 |
| 2xl | 48px | 大区块分隔 |

### 2.4 圆角系统

| 名称 | 值 | 用途 |
|------|-----|------|
| sm | 4px | 标签、小按钮 |
| md | 8px | 输入框、中按钮 |
| lg | 12px | 卡片、模态框 |
| xl | 16px | 大型组件 |
| full | 9999px | 圆形元素 |

### 2.5 阴影系统

| 名称 | 值 | 用途 |
|------|-----|------|
| sm | 0 1px 2px rgba(0,0,0,0.05) | 轻微浮起 |
| md | 0 4px 6px rgba(0,0,0,0.1) | 卡片、浮层 |
| lg | 0 10px 15px rgba(0,0,0,0.1) | 模态框、下拉 |
| xl | 0 25px 50px rgba(0,0,0,0.25) | 弹窗 |

---

## 3. 组件规范

### 3.1 按钮

#### 3.1.1 主按钮

```tsx
// 主要操作
<Button variant="primary">主要按钮</Button>

// 样式
background: #2563EB;
color: white;
border-radius: 8px;
padding: 8px 16px;
font-weight: 500;
```

#### 3.1.2 次按钮

```tsx
// 次要操作
<Button variant="secondary">次要按钮</Button>

// 样式
background: white;
color: #374151;
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 8px 16px;
```

#### 3.1.3 文字按钮

```tsx
// 辅助操作
<Button variant="ghost">文字按钮</Button>

// 样式
background: transparent;
color: #2563EB;
padding: 8px;
```

### 3.2 输入框

#### 3.2.1 标准输入框

```tsx
<Input 
  placeholder="请输入内容"
  label="标签名称"
  error="错误提示"
/>

// 样式
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 10px 12px;
focus: border-color #2563EB, ring 2px
```

### 3.3 卡片

```tsx
<Card>
  <CardHeader>标题</CardHeader>
  <CardContent>内容</CardContent>
  <CardFooter>底部操作</CardFooter>
</Card>

// 样式
background: white;
border-radius: 12px;
box-shadow: 0 4px 6px rgba(0,0,0,0.1);
padding: 16px;
```

### 3.4 模态框

```tsx
<Modal 
  isOpen={true} 
  onClose={() => {}}
  title="弹窗标题"
  size="md" // sm, md, lg, xl
>
  弹窗内容
</Modal>

// 样式
overlay: rgba(0,0,0,0.5)
content: white, border-radius 16px
animation: fadeIn, scaleIn
```

### 3.5 表格

```tsx
<Table 
  columns={columns}
  data={data}
  loading={false}
  pagination={{ page: 1, total: 100 }}
/>

// 样式
header: background #F9FAFB, font-weight 600
row: border-bottom 1px solid #E5E7EB
hover: background #F3F4F6
```

### 3.6 状态反馈

#### 3.6.1 Loading

```tsx
// 按钮加载状态
<Button loading>加载中...</Button>

// 骨架屏
<Skeleton variant="text" width="100%" />
<Skeleton variant="rectangular" height={200} />

// 呼吸动效（AI生成）
<AIGlowContainer>AI生成中...</AIGlowContainer>
```

#### 3.6.2 Toast通知

```tsx
// 成功
toast.success('操作成功')

// 错误
toast.error('操作失败')

// 警告
toast.warning('请注意')

// 信息
toast.info('提示信息')
```

---

## 4. 页面布局

### 4.1 管理后台布局

```
+--------------------------------------------------+
|  Header (固定高度 64px)                           |
|  [Logo] [搜索] [消息] [用户]                      |
+--------------------------------------------------+
|  Sidebar    |  Main Content                      |
|  (固定宽度   |  (flex: 1)                        |
|   240px)    |  [页面标题]                        |
|             |  [面包屑]                          |
|  [导航菜单]  |  [内容区域]                        |
|             |                                    |
+--------------------------------------------------+
```

### 4.2 工作台布局

```
+--------------------------------------------------+
|  胶囊导航栏 (滚动收缩)                             |
+--------------------------------------------------+
|        |                                         |
|  侧边栏  |  主工作区                              |
|  (280px)|  (内容编辑/预览)                        |
|        |                                         |
|  大纲   |  底部工具栏                            |
|  资产   |  [保存] [生成] [导出]                  |
+--------------------------------------------------+
```

### 4.3 响应式断点

| 断点 | 宽度 | 布局变化 |
|------|------|----------|
| sm | 640px | 单列布局 |
| md | 768px | 侧边栏折叠 |
| lg | 1024px | 标准布局 |
| xl | 1280px | 宽屏布局 |
| 2xl | 1536px | 最大宽度限制 |

---

## 5. 交互规范

### 5.1 动画规范

#### 5.1.1 过渡时长

| 类型 | 时长 | 用途 |
|------|------|------|
| 快速 | 150ms | 按钮悬停、状态切换 |
| 正常 | 200ms | 模态框、折叠面板 |
| 慢速 | 300ms | 页面切换、列表加载 |

#### 5.1.2 动画曲线

| 场景 | 曲线 | 效果 |
|------|------|------|
| 弹出 | ease-out | 模态框、下拉菜单 |
| 滑入 | ease-in-out | 侧边栏、抽屉 |
| 淡入 | linear | Loading、渐变 |

#### 5.1.3 特殊动效

```tsx
// AI生成呼吸动效
<AIGlowContainer>
  // 背景: 渐变呼吸动画
  // 颜色: 主色到浅蓝色循环
  // 周期: 2秒
</AIGlowContainer>

// 胶囊导航栏滚动收缩
<Header className="scroll-shrink">
  // 滚动 > 100px 后收缩为胶囊形态
  // 添加 backdrop-blur 毛玻璃效果
</Header>
```

### 5.2 交互反馈

| 操作 | 反馈形式 |
|------|----------|
| 按钮点击 | 缩放95%，颜色加深 |
| 拖拽 | 元素半透明，添加阴影 |
| 选中 | 边框高亮，背景色变化 |
| 加载 | 骨架屏 / 旋转图标 / 进度条 |
| 成功 | 绿色Toast + 可选音效 |
| 失败 | 红色Toast + 抖动动画 |

---

## 6. 组件目录

### 6.1 核心组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Button | src/components/ui/Button.tsx | 按钮组件 |
| Input | src/components/ui/Input.tsx | 输入框 |
| Card | src/components/ui/Card.tsx | 卡片 |
| Modal | src/components/ui/Modal.tsx | 模态框 |
| Table | src/components/ui/Table.tsx | 表格 |
| Toast | src/components/Toast.tsx | 通知 |
| Drawer | src/components/ui/Drawer.tsx | 抽屉 |

### 6.2 业务组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Dashboard | src/components/Dashboard.tsx | 主仪表盘 |
| OutlineGenerator | src/components/OutlineGenerator.tsx | 大纲生成器 |
| ResultCard | src/components/ResultCard.tsx | 结果卡片 |
| StyleTemplateManager | src/components/StyleTemplateManager.tsx | 模板管理 |
| CheckInModal | src/components/CheckInModal.tsx | 签到弹窗 |
| InviteModal | src/components/InviteModal.tsx | 邀请弹窗 |
| PurchaseModal | src/components/PurchaseModal.tsx | 购买弹窗 |

### 6.3 管理后台组件

| 组件 | 文件 | 说明 |
|------|------|------|
| AdminDashboard | src/components/admin/AdminDashboard.tsx | 管理首页 |
| UserManagement | src/components/admin/UserManagement.tsx | 用户管理 |
| OrderManagement | src/components/admin/OrderManagement.tsx | 订单管理 |
| RefundManagement | src/components/admin/RefundManagement.tsx | 退款管理 |
| RoleManagement | src/components/admin/RoleManagement.tsx | 角色权限 |
| ProductManagement | src/components/admin/ProductManagement.tsx | 商品管理 |
| LeadManagement | src/components/admin/LeadManagement.tsx | 线索管理 |
| AICoreEngine | src/components/admin/AICoreEngine.tsx | AI引擎配置 |

---

## 7. 样式规范

### 7.1 Tailwind CSS配置

项目使用 Tailwind CSS v4.1，配置要点：

```javascript
// tailwind.config.js 关键配置
{
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#DBEAFE'
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      },
      borderRadius: {
        DEFAULT: '8px'
      },
      boxShadow: {
        card: '0 4px 6px rgba(0,0,0,0.1)'
      }
    }
  }
}
```

### 7.2 响应式类使用

```tsx
// 移动优先
<div className="w-full md:w-1/2 lg:w-1/3">
  内容
</div>

// 隐藏/显示
<div className="hidden md:block">
  桌面端可见
</div>
```

---

## 8. 无障碍规范

### 8.1 ARIA规范

```tsx
// 按钮
<button aria-label="关闭" aria-describedby="desc">
  <Icon />
</button>

// 输入框
<input 
  aria-label="用户名"
  aria-required="true"
  aria-invalid={!!error}
/>

// 模态框
<Modal 
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">标题</h2>
</Modal>
```

### 8.2 键盘导航

| 操作 | 快捷键 |
|------|--------|
| 确认 | Enter |
| 取消 | Escape |
| 上一个 | Tab / ↑ |
| 下一个 | Tab / ↓ |
| 提交 | Ctrl + Enter |

---

## 9. 附录

### 9.1 组件开发检查清单

- [ ] 符合色彩规范
- [ ] 符合字号规范
- [ ] 响应式适配
- [ ] Loading状态
- [ ] Error状态
- [ ] 禁用状态
- [ ] 键盘导航
- [ ] ARIA标签

### 9.2 参考文档

- [完整数据字典](../03_Database/01_完整数据字典.md)
- [权限体系现状报告](../04_Modules/08_权限管理/权限体系现状报告.md)
- [组件源码](file:///src/components)

---

**维护团队**: YH-AI PPT 设计团队  
**最后更新**: 2026-02-16
