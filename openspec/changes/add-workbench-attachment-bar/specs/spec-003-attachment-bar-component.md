---
title: SPEC-003 — AttachmentBar 可复用组件
status: draft
capability: attachment-bar-ui
---

# SPEC-003: AttachmentBar 可复用组件

## 变更类型

新增（组件抽取）

## 改动文件

- `src/components/AttachmentBar.tsx` — **新建**，可复用附件条组件
- `src/components/OutlineGenerator.tsx` — 修改，向导附件条迁移为复用 `<AttachmentBar variant="generator">`

## 需求

### Requirement: 组件接口

```typescript
interface AttachmentBarProps {
  attachment: ProjectAttachment;
  variant: 'generator' | 'workbench';
  onPreview: () => void;
  onDownload: () => void;
  onClear?: () => void;
  onReplace?: () => void;
}
```

### Requirement: variant 行为差异

| variant | 替换按钮 | 清空按钮 | 预览按钮 | 下载按钮 |
|---------|---------|---------|---------|---------|
| `generator` | 隐藏 | 显示 | 显示 | 显示（下载解析文本，由调用方实现） |
| `workbench` | 显示 | 显示 | 显示 | 显示（下载原始文件，由调用方实现） |

**理由**：向导内文件可被重新选择（无需替换按钮），工作台需要独立替换入口。

### Requirement: 视觉一致性

附件条 UI 从 [OutlineGenerator.tsx:976-1009](src/components/OutlineGenerator.tsx#L976-L1009) 迁移，保持现有视觉规范：
- 左侧：文件图标（`FileText`，indigo 配色）+ 文件名 + 类型标签
- 右侧：操作按钮组（预览 `Eye` / 下载 `Download` / 替换 `RefreshCw` / 清空 `X`）
- 样式：`bg-white border-t border-slate-200`，按钮 `bg-slate-100 hover:bg-slate-200`

### Requirement: 文件大小展示

当 `attachment.size` 存在时，在类型标签旁展示格式化大小（如 `1.2 MB`）。格式化逻辑：
- < 1KB → `{n} B`
- < 1MB → `{n} KB`
- 否则 → `{n} MB`

### Requirement: OutlineGenerator 迁移

[OutlineGenerator.tsx:976-1009](src/components/OutlineGenerator.tsx#L976-L1009) 的内联附件条 JSX 替换为：

```tsx
{attachedFile && (
  <AttachmentBar
    attachment={{ name: attachedFile.name, type: attachedFile.type, url: attachedFile.url || '', size: attachedFile.size }}
    variant="generator"
    onPreview={() => setIsPreviewFileOpen(true)}
    onDownload={handleDownloadAttachment}
    onClear={handleClearFileAndContent}
  />
)}
```

**回归保证**：迁移后向导附件条的预览/下载/清空行为与当前完全一致。

## 场景

### Scenario: 向导内附件条

- **Given** OutlineGenerator 处于文件解析后状态，`attachedFile` 非空
- **When** 渲染附件条
- **Then** 显示文件名、类型、（可选）大小
- **And** 显示 预览 / 下载 / 清空 按钮（无替换按钮）

### Scenario: 工作台附件条

- **Given** 工作台 `projectAttachment` 非空
- **When** 渲染 `<AttachmentBar variant="workbench">`
- **Then** 显示文件名、类型、大小
- **And** 显示 预览 / 下载 / 替换 / 清空 四个按钮

### Scenario: 无 size 降级

- **Given** `attachment.size` 为 undefined
- **When** 渲染附件条
- **Then** 不显示大小标签（不报错）

## 验证方式

- `npm run build` 编译通过
- 手动：向导内附件条行为与迁移前一致（预览/下载/清空）
- 手动：工作台附件条显示四个按钮
- 单元测试（可选）：`AttachmentBar` 渲染不同 variant 时按钮数量正确
