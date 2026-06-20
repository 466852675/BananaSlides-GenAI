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

**前端类型暴露**：在 `ProjectSession` 增加 `attachment?: ProjectAttachment | null` 字段，`transformProject` 从 `parsedGlobalConfig.fileAttachment` 提取。这样 `StyleConfig` 接口保持纯净（只管样式），附件作为项目级独立概念。

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
    // 并行：客户端解析（AI 上下文）+ 服务器上传（持久化）
    const [parseResult, uploadResult] = await Promise.allSettled([
      extractTextFromUpload(file, appSettings, toastCb),
      uploadFile(file, { purpose: 'source-document', projectId }),
    ]);

    // 解析必须成功（AI 生成依赖它）
    if (parseResult.status !== 'fulfilled' || !parseResult.value.text) {
      throw new Error('文件解析失败');
    }
    const { text, isFallback } = parseResult.value;

    // 上传可能失败 —— 降级：url 为空，向导内仍可工作
    const url = uploadResult.status === 'fulfilled' ? uploadResult.value : '';
    if (uploadResult.status === 'rejected') {
      onShowToast('文件上传失败，附件将无法在工作台下载', 'warning');
    }

    setFileParsedContent(text);
    setAttachedFile({
      name: file.name,
      type: file.type || 'TXT',
      content: text,
      url,       // 新增
      size: file.size,  // 新增
    });
  } catch (error) { ... }
  finally { setIsReadingFile(false); }
};
```

**降级策略**：`Promise.allSettled` 确保上传失败不阻断解析。`url` 为空时：
- 向导内行为不变（content 仍在）
- 导出工作台时 attachment 的 url 为空 → 工作台下载/预览按钮禁用 + 提示

### 5.2 `handleFinish()` 改造（OutlineGenerator）

```typescript
const handleFinish = () => {
  // ... 现有 slides 构建 ...
  const attachment: ProjectAttachment | null = attachedFile?.url
    ? { name: attachedFile.name, type: attachedFile.type, url: attachedFile.url, size: attachedFile.size }
    : null;  // url 为空则不传（降级：工作台无附件条）
  onFinish(slides, attachment);
};
```

### 5.3 `handleOutlineImport()` 改造（App.tsx）

```typescript
const handleOutlineImport = (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => {
  // 存储附件到项目级状态 + 持久化
  if (attachment) {
    setProjectAttachment(attachment);
    persistAttachment(attachment);  // 合并到 globalConfig 并 updateProject
  }
  // ... 现有 slides 导入逻辑不变 ...
};
```

### 5.4 持久化辅助函数（App.tsx）

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
| 上传失败 | `url=""`，向导 warning toast，工作台无附件条（attachment=null） |
| 历史项目无 fileAttachment | `project.attachment ?? null` → 无附件条（符合预期） |
| 替换附件 | 新 uploadFile → 更新 url → globalConfig 同步；旧文件由 AssetRegistry 清理 |
| 清空附件 | 移除引用，不删服务器文件（AssetRegistry 生命周期管理） |
| globalConfig JSON 解析失败 | `catch {}` → 空对象 → 无附件（transformProject 已有容错） |
| 多标签页同时编辑 | 沿用现有 WebSocket slides_update 机制；附件变更通过 updateProject 持久化，他端刷新后可见 |

## 8. 非目标

- Agent 对话模式文件纳入（语义不同，未来扩展）
- 替换附件触发重新生成（附件是引用，幻灯片独立）
- DB schema 新增字段（复用 globalConfig JSON）
- 附件版本历史（单附件，替换即覆盖）
