# 设计文档：项目工作台附件条

## 1. 问题根因

附件信息在 `OutlineGenerator.handleFinish()` 处断裂——`attachedFile` 状态（`{ name, type, content }`）从不传递到工作台：

```
OutlineGenerator.attachedFile (组件内状态，含解析内容)
    ↓ handleFinish() 硬编码 originalFile: null  ← 断点
App.tsx handleOutlineImport(slides)  ← 只收 slides，无文件信息
    ↓
工作台 ResultCard 渲染  ← 无附件展示
```

修复策略：在断点处将附件元信息**向上传出**（onFinish 扩展），在 App.tsx **项目级存储 + 持久化**，工作台**渲染附件条**。

## 2. 架构概览

```
┌─────────────────────────────────────────────────────┐
│  OutlineGenerator (向导)                             │
│  processFile():                                      │
│    Promise.allSettled([                              │
│      extractTextFromUpload(file),  ← AI 上下文       │
│      uploadFile(file)               ← 持久化 URL     │
│    ])                                                │
│    → attachedFile = { name, type, content, url, size }│
│                                                      │
│  handleFinish(slides, attachment):                   │
│    onFinish(slides, attachment)  ← 向上传出          │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  App.tsx (项目编排)                                   │
│  projectAttachment state ← attachment                │
│  持久化: globalConfig.fileAttachment (JSON)           │
│  加载: transformProject 提取 fileAttachment           │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  工作台 UI                                            │
│  <AttachmentBar attachment={projectAttachment}        │
│     variant="workbench"                              │
│     onPreview / onDownload / onReplace / onClear />  │
└─────────────────────────────────────────────────────┘
```

## 3. 持久化方案（无 DB 迁移）

后端 `Project.globalConfig` 是 JSON 字符串，前端 `transformProject` 容错解析。利用这一点存储附件元数据：

**存储位置**：`globalConfig` JSON 内的 `fileAttachment` 键

**存储内容**（轻量，约 100 字节）：
```json
{
  "styleName": "...", "colorPalette": "...", ...,
  "fileAttachment": {
    "name": "report.pdf",
    "type": "application/pdf",
    "url": "/uploads/up-xxx.pdf",
    "size": 123456
  }
}
```

**不存储** `content`（解析后的文本）——避免 JSON 膨胀。预览时按需从 `url` 获取。

**前端类型暴露**：在 `ProjectSession` 增加 `attachment?: ProjectAttachment | null` 字段，`transformProject` 从 `parsedGlobalConfig.fileAttachment` 提取，**提取后删除 `fileAttachment` 键避免污染 `StyleConfig`**。

```typescript
// transformProject 内：
const attachment = (globalConfig as any).fileAttachment ?? null;
delete (globalConfig as any).fileAttachment; // 关键：防止键污染 StyleConfig
```

这样 `StyleConfig` 接口保持纯净（只管样式），附件作为项目级独立概念。

## 4. 组件设计

### 4.1 `<AttachmentBar>` 可复用组件

```
src/components/AttachmentBar.tsx
```

**Props**：
```typescript
interface AttachmentBarProps {
  attachment: ProjectAttachment;
  variant: 'generator' | 'workbench';
  onPreview: () => void;
  onDownload: () => void;
  onClear?: () => void;
  onReplace?: () => void;  // 仅 workbench variant 显示
}
```

**行为差异**：
| variant | 替换按钮 | 清空按钮 | 来源 |
|---------|---------|---------|------|
| `generator` | 隐藏 | 显示 | OutlineGenerator 向导内 |
| `workbench` | 显示 | 显示 | 工作台全局设置上方 |

**UI**：从 [OutlineGenerator.tsx:976-1009](src/components/OutlineGenerator.tsx#L976-L1009) 迁移现有附件条 JSX，保持视觉一致（文件图标 + 名称 + 类型 + 操作按钮组）。

### 4.2 预览模态复用

OutlineGenerator 已有文件预览模态（[OutlineGenerator.tsx:1011-1029](src/components/OutlineGenerator.tsx#L1011-L1029)，Markdown 渲染）。工作台需要增强版预览：
- PDF：`<iframe src={url}>` 直接渲染原文件
- 文本类：`fetch(url)` → Markdown 渲染（复用 `ReactMarkdown + remarkGfm`）

## 5. 关键函数设计

### 5.1 `processFile()` 改造（OutlineGenerator）

```typescript
const processFile = async (file: File) => {
  if (isReadingFile) return;
  setIsReadingFile(true);
  try {
    // 构建 upload 参数 —— projectId 可能 undefined（dashboard 新建时），需条件包含避免追加 "undefined" 字符串
    const uploadParams: Record<string, string> = { purpose: 'source-document' };
    if (projectId) uploadParams.projectId = projectId;

    // 并行：客户端解析（AI 上下文）+ 服务器上传（持久化）
    const [parseResult, uploadResult] = await Promise.allSettled([
      extractTextFromUpload(file, appSettings, (msg, type) => {
        const toastType = type === 'loading' ? 'loading' : type === 'error' ? 'error' : 'success';
        onShowToast(msg, toastType);
      }),
      uploadFile(file, uploadParams),
    ]);

    // 解析必须成功（AI 生成依赖它）
    if (parseResult.status !== 'fulfilled' || !parseResult.value.text) {
      throw new Error('文件解析失败');
    }
    const { text, isFallback } = parseResult.value;

    // 上传可能失败 —— 降级：url 为空，向导内仍可工作
    const url = uploadResult.status === 'fulfilled' ? uploadResult.value : '';
    if (uploadResult.status === 'rejected') {
      onShowToast('文件上传失败，附件将无法在工作台预览/下载', 'warning');
    }

    setFileParsedContent(text);
    setAttachedFile({
      name: file.name,
      type: file.type || 'TXT',
      content: text,
      url,       // 新增（可能为空字符串）
      size: file.size,  // 新增
    });
  } catch (error) { ... }
  finally { setIsReadingFile(false); }
};
```

**降级策略**：`Promise.allSettled` 确保上传失败不阻断解析。`url` 为空时：
- 向导内行为不变（content 仍在）
- **附件信息仍传出**（url 为空字符串），工作台附件条**仍显示文件名和类型**，但预览/下载按钮**禁用**并显示 tooltip「文件上传失败，暂不可用」
- 附件条左侧显示红色警告图标（`AlertCircle`），明确指示状态异常
- 用户可通过「替换」按钮重新上传修复

### 5.2 `handleFinish()` 改造（OutlineGenerator）

```typescript
const handleFinish = () => {
  // ... 现有 slides 构建 ...
  // 关键：只要 attachedFile 存在就传出（即使 url 为空 → 工作台降级显示红色警告）
  const attachment: ProjectAttachment | null = attachedFile
    ? { name: attachedFile.name, type: attachedFile.type, url: attachedFile.url || '', size: attachedFile.size }
    : null;  // 只有「未上传任何文件」时才为 null（如「一句话生成」）
  onFinish(slides, attachment);
};
```

**规则**：
- `attachedFile` 存在 → 传出附件对象（url 可能为空 → 工作台降级显示，用户可「替换」修复）
- `attachedFile` 为 null（「一句话生成」无文件） → 传 null → 工作台无附件条

### 5.3 `handleOutlineImport()` 改造（App.tsx）— 同时处理两个分支

```typescript
const handleOutlineImport = (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => {
  // 分两支处理
  if (outlineGeneratorSource === 'dashboard') {
    // Dashboard 新建项目：附件暂存，等 handleCreateProjectFromOutline 完成后再持久化
    handleCreateProjectFromOutline(slides, outlineInitialTopic || "智能生成演示文稿", attachment);
    setOutlineResetKey(prev => prev + 1);
    return;
  }

  // Workbench 追加：现有逻辑 + 附件处理
  // 替换确认：如果已有附件，确认后再覆盖（ConfirmDialog 只支持 'danger'|'info'，用 'danger'）
  if (attachment && projectAttachment) {
    showConfirm(
      '替换附件',
      `当前项目已有附件 ${projectAttachment.name}，是否替换为新文件 ${attachment.name}？此操作不影响已生成的幻灯片。`,
      () => { doSetAttachment(attachment); },
      'danger'
    );
    // 不阻断幻灯片追加
  } else if (attachment) {
    doSetAttachment(attachment);
  }
  // ... 现有 slides 导入逻辑不变 ...
};

// 抽取的公共设置函数（configOverride 用于新建项目时传入 newConfig，避免闭包陈旧 config）
const doSetAttachment = (attachment: ProjectAttachment | null, configOverride?: StyleConfig) => {
  setProjectAttachment(attachment);
  persistAttachment(attachment, configOverride);
};
```

`handleCreateProjectFromOutline` 增加 `attachment?` 参数，在项目创建成功后持久化。**关键：必须传入 `newConfig` 而非依赖闭包内陈旧的 `config`**（因为 `setConfig(newConfig)` 是异步的，此时闭包 `config` 仍是旧值）：

```typescript
const handleCreateProjectFromOutline = async (
  slides: GeneratedSlide[], topic: string, attachment?: ProjectAttachment | null
) => {
  // ... 现有创建逻辑 ...
  const createdProject = await createProjectMutation.mutateAsync({...});
  // ... sync items ...
  setCurrentProjectId(createdProject.id);
  prevProjectIdRef.current = createdProject.id;
  const newConfig = createdProject.globalConfig || DEFAULT_STYLE_CONFIG;
  setConfig(newConfig);  // 异步更新，闭包 config 仍为旧值
  // ... 其余 setStyleMap/setItems 等 ...

  // 项目创建成功、currentProjectId 已设置后持久化附件
  // 必须传 newConfig —— 否则 persistAttachment 会用陈旧 config 覆盖新项目的样式配置
  if (attachment) {
    doSetAttachment(attachment, newConfig);
  }
};
```

### 5.4 持久化辅助函数（App.tsx）

使用 `serializeGlobalConfig` 函数桥接 `StyleConfig` 和 `ProjectAttachment`，避免 TypeScript 类型冲突：

```typescript
const serializeGlobalConfig = (styleConfig: StyleConfig, attachment: ProjectAttachment | null): string => {
  return JSON.stringify({ ...styleConfig, fileAttachment: attachment });
};

// configOverride：新建项目场景传入 newConfig，避免闭包内 config 陈旧
const persistAttachment = (attachment: ProjectAttachment | null, configOverride?: StyleConfig) => {
  if (!currentProjectIdRef.current) return;
  const cfg = configOverride ?? config;
  updateProjectMutation.mutate({
    id: currentProjectIdRef.current,
    data: { globalConfig: serializeGlobalConfig(cfg, attachment) }
  });
};
```

### 5.5 项目加载恢复（App.tsx）

项目切换/加载时（已有 useEffect 监听 currentProjectId 变化），从 `project.attachment` 恢复：

```typescript
setProjectAttachment(project?.attachment ?? null);
```

## 6. 数据流完整闭环

```
[上传] processFile → Promise.allSettled([parse, upload]) → attachedFile{url}
   ↓
[导出] handleFinish → onFinish(slides, attachment)
   ↓
[存储] handleOutlineImport → setProjectAttachment + persistAttachment → globalConfig.fileAttachment → DB
   ↓
[渲染] 工作台 <AttachmentBar attachment={projectAttachment} />
   ↓
[预览] onPreview → fetch(url) / iframe(url)
[下载] onDownload → <a href={url} download={name}>
[替换] onReplace → fileInput → uploadFile → setProjectAttachment + persistAttachment
[清空] onClear → confirm → setProjectAttachment(null) + persistAttachment(null)
   ↓
[重开] transformProject → project.attachment → setProjectAttachment → 附件条重现
```

## 7. 边界与降级

| 场景 | 行为 |
|------|------|
| 上传失败 | `url=""`，向导 warning toast；附件信息仍传出，工作台附件条**降级显示**（红色警告图标 + 预览/下载禁用 + tooltip），用户可「替换」修复 |
| 历史项目无 fileAttachment | `project.attachment ?? null` → 无附件条（符合预期） |
| 替换附件 | 新 uploadFile → 更新 url → globalConfig 同步；旧文件由 AssetRegistry 清理 |
| 清空附件 | 移除引用，不删服务器文件（AssetRegistry 生命周期管理） |
| globalConfig JSON 解析失败 | `catch {}` → 空对象 → 无附件（transformProject 已有容错） |
| 多标签页同时编辑 | 沿用现有 WebSocket slides_update 机制；附件变更通过 updateProject 持久化，他端刷新后可见 |
| 「一句话生成」无文件 | `attachedFile` 为 null → `attachment = null` → 工作台无附件条 |

## 8. 非目标

- Agent 对话模式文件纳入（语义不同，未来扩展）
- 替换附件触发重新生成（附件是引用，幻灯片独立）
- DB schema 新增字段（复用 globalConfig JSON）
- 附件版本历史（单附件，替换即覆盖）
