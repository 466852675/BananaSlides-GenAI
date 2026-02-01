# 修复销售线索管理确认弹窗样式问题

## 任务完成记录

### 修改文件
- `src/components/admin/LeadManagement.tsx`

### 修改内容
1. **导入 ConfirmDialog 组件** (第25行)
   ```typescript
   import { ConfirmDialog } from '../ConfirmDialog';
   ```

2. **添加状态管理** (第56-63行)
   ```typescript
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

3. **修改删除处理函数** (第93-115行)
   - 将原 `window.confirm()` 改为打开自定义对话框
   - 新增 `confirmDelete()` 和 `closeDeleteDialog()` 函数

4. **添加 ConfirmDialog 组件到 JSX** (第335-345行)
   ```tsx
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

### 验证结果
- `npx tsc --noEmit` 通过，无 TypeScript 错误

### 参考实现
- `OrderManagement.tsx` 第531-544行展示了 ConfirmDialog 的使用模式
- `UserManagement.tsx` 也有类似实现

### 关键学习
1. ConfirmDialog 组件支持以下 props:
   - `isOpen`, `title`, `message`, `onConfirm`, `onCancel`
   - `type`: 'danger' | 'info' (控制图标和按钮颜色)
   - `confirmText`, `cancelText`: 自定义按钮文字
   - `showInput`, `inputValue`, `onInputChange`: 可选的输入框功能

2. 状态管理模式:
   - 使用单一状态对象管理对话框的显示状态和相关数据
   - 通过 `setDeleteDialog(prev => ({ ...prev, isOpen: false }))` 模式更新状态
