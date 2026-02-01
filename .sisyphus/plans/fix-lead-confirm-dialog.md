# 修复销售线索管理确认弹窗样式问题

## 问题描述
在后台管理的**销售线索**页面中，点击删除按钮时弹出的确认对话框使用的是浏览器原生的 `window.confirm()`，样式与项目整体设计系统不匹配。

**当前问题代码位置：** `src/components/admin/LeadManagement.tsx` 第 94 行
```typescript
if (!window.confirm(`确定要删除线索「${name}」吗？此操作不可恢复。`)) return;
```

**期望效果：** 使用项目自定义的 `ConfirmDialog` 组件，与其他管理页面（如订单管理、用户管理）保持一致。

---

## 解决方案

将原生 `window.confirm()` 替换为项目现有的 `ConfirmDialog` 组件。

**参考实现：** 其他管理页面已正确使用 ConfirmDialog：
- `src/components/admin/OrderManagement.tsx` 第 531 行
- `src/components/admin/UserManagement.tsx` 第 600 行
- `src/components/ConfirmDialog.tsx` 组件定义

---

## 需要修改的文件

### 文件：src/components/admin/LeadManagement.tsx

#### 1. 导入 ConfirmDialog 组件
**位置：** 第 1-25 行（import 区域）

**添加：**
```typescript
import { ConfirmDialog } from '../ConfirmDialog';
```

#### 2. 添加状态管理
**位置：** 第 42-54 行（现有 state 定义之后）

**添加：**
```typescript
// 确认对话框状态
const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    leadId: string;
    leadName: string;
}>({
    isOpen: false,
    leadId: '',
    leadName: ''
});
```

#### 3. 修改删除处理函数
**位置：** 第 93-101 行

**原代码：**
```typescript
const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除线索「${name}」吗？此操作不可恢复。`)) return;
    try {
        await AdminAPI.deleteLead(id);
        fetchLeads(); // 刷新列表
    } catch (error) {
        alert('删除失败');
    }
};
```

**新代码：**
```typescript
const handleDelete = async (id: string, name: string) => {
    setDeleteDialog({
        isOpen: true,
        leadId: id,
        leadName: name
    });
};

const confirmDelete = async () => {
    try {
        await AdminAPI.deleteLead(deleteDialog.leadId);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        fetchLeads(); // 刷新列表
    } catch (error) {
        alert('删除失败');
    }
};

const closeDeleteDialog = () => {
    setDeleteDialog(prev => ({ ...prev, isOpen: false }));
};
```

#### 4. 添加 ConfirmDialog 组件到 JSX
**位置：** 第 328 行（</div> 结束标签之前，Pagination Info 之后）

**添加：**
```tsx
{/* 删除确认对话框 */}
<ConfirmDialog
    isOpen={deleteDialog.isOpen}
    title="确认删除"
    message={`确定要删除线索「${deleteDialog.leadName}」吗？此操作不可恢复。`}
    onConfirm={confirmDelete}
    onCancel={closeDeleteDialog}
    type="danger"
    confirmText="删除"
    cancelText="取消"
/>
```

---

## 修改后的完整文件结构

```typescript
// 1. Imports
import { ConfirmDialog } from '../ConfirmDialog';

// 2. State (添加 deleteDialog)
const [deleteDialog, setDeleteDialog] = useState<...>(...);

// 3. handleDelete (修改)
const handleDelete = async (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, leadId: id, leadName: name });
};

// 4. confirmDelete (新增)
const confirmDelete = async () => { ... };

// 5. closeDeleteDialog (新增)
const closeDeleteDialog = () => { ... };

// 6. JSX 底部添加 ConfirmDialog 组件
<ConfirmDialog ... />
```

---

## 样式对比

### 修复前（原生 confirm）
- 浏览器默认样式
- 白色背景，无圆角
- 系统字体
- 无动画效果

### 修复后（ConfirmDialog）
- 毛玻璃遮罩（backdrop-blur）
- 圆角卡片设计（rounded-xl）
- 紫色/红色主题图标
- 渐变背景按钮
- 淡入缩放动画
- 与项目设计系统完全一致

---

## 验证步骤

1. 启动开发服务器：`npm run dev`
2. 访问销售线索管理页面
3. 点击任意线索的「删除」按钮
4. 确认弹出的是自定义样式的确认对话框
5. 点击「删除」确认删除成功
6. 点击「取消」关闭对话框不执行删除

---

## 相关参考

- ConfirmDialog 组件：`src/components/ConfirmDialog.tsx`
- OrderManagement 参考实现：`src/components/admin/OrderManagement.tsx`
- UserManagement 参考实现：`src/components/admin/UserManagement.tsx`
