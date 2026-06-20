---
title: SPEC-004 — 工作台附件条集成与持久化
status: draft
capability: workbench-attachment-integration
---

# SPEC-004: 工作台附件条集成与持久化

## 变更类型

修改（App.tsx 编排 + projects.ts 序列化）

## 改动文件

- `src/App.tsx` — 新增 `projectAttachment` state、持久化、加载恢复、附件条渲染、替换/清空/预览/下载处理
- `src/api/projects.ts` — `transformProject` 提取 `attachment`；序列化时合并 `fileAttachment` 到 globalConfig

## 需求

### Requirement: 项目级状态

App.tsx 新增状态：

```typescript
const [projectAttachment, setProjectAttachment] = useState<ProjectAttachment | null>(null);
```

### Requirement: 持久化（无 DB 迁移）

附件元数据存入 `globalConfig` JSON 的 `fileAttachment` 键。`persistAttachment` 辅助函数：

```typescript
const persistAttachment = (attachment: ProjectAttachment | null) => {
  if (!currentProjectIdRef.current) return;
  const newGlobalConfig = { ...config, fileAttachment: attachment };
  updateProjectMutation.mutate({
    id: currentProjectIdRef.current,
    data: { globalConfig: JSON.stringify(newGlobalConfig) }
  });
};
```

**规则**：
- `attachment = null` 时，`fileAttachment` 设为 null（清空）
- 复用现有 `updateProjectMutation`，不新增 API 端点

### Requirement: handleOutlineImport 接收附件

```typescript
const handleOutlineImport = (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => {
  if (attachment) {
    setProjectAttachment(attachment);
    persistAttachment(attachment);
  }
  // ... 现有 slides 导入逻辑不变 ...
};
```

覆盖两个分支（dashboard 新建 / workbench 追加）均需处理 attachment。

### Requirement: transformProject 提取附件

`src/api/projects.ts` `transformProject` 中，从解析后的 globalConfig 提取：

```typescript
const transformed: ProjectSession = {
  // ... 现有字段 ...
  attachment: (globalConfig as any).fileAttachment ?? null,  // 新增
};
```

利用现有 `catch { globalConfig = {} }` 容错——历史项目无此键时 `attachment = null`。

### Requirement: 项目加载恢复

App.tsx 已有 useEffect 监听 `currentProjectId` 变化加载项目。在该处增加附件恢复：

```typescript
setProjectAttachment(project?.attachment ?? null);
```

项目切换时旧附件被清除，新项目附件被加载。

### Requirement: 工作台附件条渲染

在全局设置面板**上方**（[App.tsx:4401](src/App.tsx#L4401) 附近 `flex flex-col gap-6` 区域顶部）渲染：

```tsx
{projectAttachment && viewMode === 'workbench' && !previewSnapshot && (
  <AttachmentBar
    attachment={projectAttachment}
    variant="workbench"
    onPreview={() => setIsAttachmentPreviewOpen(true)}
    onDownload={() => downloadAttachment(projectAttachment)}
    onReplace={() => attachmentFileInputRef.current?.click()}
    onClear={handleClearAttachment}
  />
)}
```

**条件**：仅工作台视图 + 非快照预览模式时显示。

### Requirement: 操作实现

**下载原始文件**（修复向导下载 .txt 的体验割裂）：
```typescript
const downloadAttachment = (att: ProjectAttachment) => {
  const link = document.createElement('a');
  link.href = att.url;
  link.download = att.name;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**替换**：
```typescript
const handleReplaceAttachment = async (file: File) => {
  const url = await uploadFile(file, { purpose: 'source-document', projectId: currentProjectIdRef.current });
  const newAttachment: ProjectAttachment = { name: file.name, type: file.type, url, size: file.size };
  setProjectAttachment(newAttachment);
  persistAttachment(newAttachment);
  showToast('附件已替换', 'success');
};
```

**清空**（带确认）：
```typescript
const handleClearAttachment = () => {
  showConfirm('移除附件', '确定移除源文件附件吗？此操作不影响已生成的幻灯片。', () => {
    setProjectAttachment(null);
    persistAttachment(null);
    closeConfirm();
    showToast('附件已移除', 'success');
  }, 'danger');
};
```

**预览**：
- PDF（`type === 'application/pdf'`）：`<iframe src={url}>` 直接渲染
- 其他：`fetch(url)` 获取文本 → `<ReactMarkdown>` 渲染
- 超大文件提示「建议下载后查看」

### Requirement: 替换不触发重生成

替换/清空附件**只更新引用**，不修改 `items`（幻灯片），不触发生成流程。UI 通过标题「原始文档」明确传达附件是引用而非内容绑定。

## 场景

### Scenario: 导入后附件持久化

- **Given** 用户通过文件生成 PPT，点击导入工作台
- **When** `handleOutlineImport` 接收非空 attachment
- **Then** `projectAttachment` state 被设置
- **And** `globalConfig.fileAttachment` 写入 DB（通过 updateProjectMutation）

### Scenario: 关闭重开附件仍在

- **Given** 项目已持久化 `fileAttachment`
- **When** 用户关闭浏览器后重新打开该项目
- **Then** `transformProject` 从 globalConfig 提取 attachment
- **And** 工作台附件条显示，可预览可下载

### Scenario: 替换附件

- **Given** 工作台已有附件 report-v1.pdf
- **When** 用户点击替换，选择 report-v2.pdf
- **Then** `uploadFile` 上传新文件
- **And** `projectAttachment` 更新为 report-v2.pdf
- **And** globalConfig 同步更新
- **And** toast「附件已替换」
- **And** 已有幻灯片内容不变

### Scenario: 清空附件

- **Given** 工作台已有附件
- **When** 用户点击清空并确认
- **Then** `projectAttachment` 变为 null
- **And** 附件条消失
- **And** globalConfig.fileAttachment 设为 null
- **And** 已有幻灯片不变

### Scenario: 历史项目无附件

- **Given** DB 中项目 globalConfig 不含 fileAttachment
- **When** 加载该项目
- **Then** `project.attachment` 为 null
- **And** 工作台不显示附件条（无回归）

### Scenario: 快照预览模式

- **Given** 用户查看历史快照（previewSnapshot 非空）
- **When** 渲染工作台
- **Then** 附件条不显示（快照为只读历史视图）

## 验证方式

- `npm run build` 编译通过
- `cd server && bun test` 后端测试通过（globalConfig JSON 序列化无破坏）
- 手动 E2E：
  1. 上传文件 → 生成 → 导入工作台 → 附件条出现
  2. 预览（PDF iframe / 文本 Markdown）
  3. 下载原始文件（得到原文件而非 .txt）
  4. 替换 → 附件信息更新
  5. 清空 → 附件条消失
  6. 刷新页面 → 附件条重现（持久化验证）
  7. 打开历史项目 → 无附件条（降级验证）
