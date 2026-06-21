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

附件元数据存入 `globalConfig` JSON 的 `fileAttachment` 键。使用 `serializeGlobalConfig` 桥接 `StyleConfig` 和 `ProjectAttachment`，避免 `{...config, fileAttachment}` 导致的 TS 类型冲突。`persistAttachment` 支持可选 `configOverride` 参数，用于新建项目场景传入 `newConfig`（避免闭包内 `config` 陈旧）：

```typescript
const serializeGlobalConfig = (styleConfig: StyleConfig, attachment: ProjectAttachment | null): string => {
  return JSON.stringify({ ...styleConfig, fileAttachment: attachment });
};

const persistAttachment = (attachment: ProjectAttachment | null, configOverride?: StyleConfig) => {
  if (!currentProjectIdRef.current) return;
  const cfg = configOverride ?? config;
  updateProjectMutation.mutate({
    id: currentProjectIdRef.current,
    data: { globalConfig: serializeGlobalConfig(cfg, attachment) }
  });
};
```

**规则**：
- `attachment = null` 时，`fileAttachment` 设为 null（清空）
- 复用现有 `updateProjectMutation`，不新增 API 端点
- 新建项目场景（`handleCreateProjectFromOutline`）必须传 `configOverride = newConfig`，否则会用陈旧 `config` 覆盖新项目的样式配置

### Requirement: handleOutlineImport 接收附件 — 处理两个分支 + 替换确认

```typescript
const handleOutlineImport = (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => {
  // Dashboard 新建项目：暂存附件，等项目创建完成后由 handleCreateProjectFromOutline 持久化
  if (outlineGeneratorSource === 'dashboard') {
    handleCreateProjectFromOutline(slides, outlineInitialTopic || "智能生成演示文稿", attachment);
    setOutlineResetKey(prev => prev + 1);
    return;
  }

  // Workbench 追加
  // 如果已有附件且新附件非空，弹出替换确认（ConfirmDialog 只支持 'danger'|'info'，用 'danger'）
  if (attachment && projectAttachment) {
    showConfirm(
      '替换附件',
      `当前项目已有附件 ${projectAttachment.name}，是否替换为新文件 ${attachment.name}？此操作不影响已生成的幻灯片。`,
      () => { doSetAttachment(attachment); },
      'danger'
    );
  } else if (attachment) {
    doSetAttachment(attachment);
  }
  // ... 现有 slides 导入逻辑不变 ...
};

// configOverride：新建项目场景传入 newConfig，避免闭包内 config 陈旧
const doSetAttachment = (attachment: ProjectAttachment | null, configOverride?: StyleConfig) => {
  setProjectAttachment(attachment);
  persistAttachment(attachment, configOverride);
};
```

**dashboard 分支详解**：`handleCreateProjectFromOutline` 增加 `attachment?` 参数。**关键：必须传入 `newConfig` 给 `doSetAttachment`**——因为 `setConfig(newConfig)` 是异步的，此时闭包内的 `config` 仍是旧值，直接用会导致 `persistAttachment` 用旧样式配置覆盖新项目：

```typescript
const handleCreateProjectFromOutline = async (
  slides: GeneratedSlide[], topic: string, attachment?: ProjectAttachment | null
) => {
  // ... 现有创建逻辑 ...
  const createdProject = await createProjectMutation.mutateAsync({...});
  setCurrentProjectId(createdProject.id);
  prevProjectIdRef.current = createdProject.id;
  const newConfig = createdProject.globalConfig || DEFAULT_STYLE_CONFIG;
  setConfig(newConfig); // 异步更新，闭包 config 仍为旧值
  // ... setStyleMap/setItems 等 ...

  // 项目创建成功、currentProjectId 已设置后持久化附件
  if (attachment) {
    doSetAttachment(attachment, newConfig); // ← 必须传 newConfig
  }
};
```

### Requirement: transformProject 提取附件（防止数据污染）

`src/api/projects.ts` `transformProject` 中，从解析后的 globalConfig 提取 attachment，**提取后删除 `fileAttachment` 键**，防止该键污染 `StyleConfig`（否则后续 `{...styleConfig}` 会携带未知属性）：

```typescript
// transformProject 内：
const attachment = (globalConfig as any).fileAttachment ?? null;
delete (globalConfig as any).fileAttachment; // 关键：防止键污染 StyleConfig — 否则后续 JSON.stringify 会写入无效键

const transformed: ProjectSession = {
  // ... 现有字段 ...
  attachment,  // 新增
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
  try {
    const url = await uploadFile(file, { purpose: 'source-document', projectId: currentProjectIdRef.current });
    const newAttachment: ProjectAttachment = { name: file.name, type: file.type, url, size: file.size };
    setProjectAttachment(newAttachment);
    persistAttachment(newAttachment);
    showToast(`附件已替换为 ${file.name}`, 'success');
  } catch (error) {
    showToast('附件替换失败，请重试', 'error');
  }
};
```

替换按钮 hover tooltip：`"替换源文档（不影响已生成的幻灯片）"`
替换成功后 toast：`"附件已替换为 xxx.pdf"`（文案不含"生成"，避免用户误解会重新生成）

**隐藏文件输入**（与 OutlineGenerator 保持一致的 accept 类型）：
```tsx
<input
  type="file"
  ref={attachmentFileInputRef}
  className="hidden"
  accept=".txt,.md,.json,.pdf,.doc,.docx"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleReplaceAttachment(file);
    e.target.value = ''; // 重置以允许重复选择同一文件
  }}
/>
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

**预览（三档降级）**：

| 文件类型 | 预览方式 | 实现 |
|---------|---------|------|
| `.txt` `.md` `.json` | Markdown 渲染 | `fetch(url).text()` → `<ReactMarkdown>` |
| `.pdf` | 浏览器原生渲染 | `<iframe src={url}>` |
| 其他（`.docx` `.doc` `.pptx` `.ppt` `.xlsx` 等） | 不支持预览 | 显示文案「该文件类型暂不支持在线预览，请下载后查看」+ 突出下载按钮 |

预览模态通用骨架：
```tsx
<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
  <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
    {/* 头部：文件名 + 关闭 */}
    {/* 主体：按类型分支渲染 */}
  </div>
</div>
```

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
- **When** 用户从 OutlineGenerator 再次导入新附件（或在工作台直接点击替换按钮）
- **Then** 工作台替换：`uploadFile` 上传新文件 → 更新 → toast「附件已替换为 report-v2.pdf」
- **And** 重复导入：弹出替换确认弹窗
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

### Scenario: 上传失败时正常展示（降级）

- **Given** 用户上传文件但服务器 `/api/upload` 失败
- **When** 导入工作台
- **Then** 附件条仍显示文件名和类型（url 为空）
- **And** 预览/下载按钮**禁用**，tooltip 提示「文件上传失败，暂不可用」
- **And** 附件条左侧显示红色错误图标表示异常状态

### Scenario: 重复打开 OutlineGenerator 时替换确认

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
