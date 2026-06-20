# 变更提案：项目工作台附件条（源文件预览/下载/替换/清空）

## 背景与动机

YH-AI 智能PPT创作平台中，用户在 **OutlineGenerator**（主题输入 / 大纲生成 / 详细内容生成三步向导）上传源文件后，该文件信息（`attachedFile` 状态）**仅在向导内可见**——向导底部有一个持久附件条，支持预览 / 下载 / 清空。

但用户一旦点击"完成并导入工作台"，文件信息**完全丢失**：

- [OutlineGenerator.tsx:887](src/components/OutlineGenerator.tsx#L887) `handleFinish()` 创建 `GeneratedSlide[]` 时硬编码 `originalFile: null`
- `attachedFile`（`{ name, type, content }`）**从不传递**到工作台
- [App.tsx:1714](src/App.tsx#L1714) `handleOutlineImport(slides)` 只接收幻灯片，无文件信息
- 工作台 [App.tsx:4742](src/App.tsx#L4742) 渲染 `ResultCard` 列表，**无任何项目级附件展示**

**用户痛点**：生成阶段能看到源文件，进入工作台后源文件"消失"了。用户失去了对"这份 PPT 是基于哪个文档生成的"的追溯能力，也无法在工作台重新预览 / 下载源文件。

## 目标

1. **一致性** — 工作台提供与 OutlineGenerator 向导**同等的附件能力**（预览 / 下载 / 清空），消除导入后的信息断连
2. **可追溯** — 用户随时可在工作台查看"这份 PPT 基于哪个源文件生成"
3. **持久化** — 关闭浏览器后重新打开项目，附件依然可见可下载
4. **可替换** — 用户可在工作台直接替换源文件，无需重返三步向导
5. **体验升级** — 下载提供**原始文件**（而非解析后的纯文本），修复向导中"下载得到 .txt 而非原文件"的体验割裂

## 范围

### 包含

- OutlineGenerator `processFile()` 中**并行**上传文件到服务器（与客户端解析同时进行）
- `attachedFile` 状态升级为 `{ name, type, content, url, size }`（新增 `url` / `size`）
- `onFinish` 回调扩展，将附件信息随幻灯片传出
- App.tsx 新增 `projectAttachment` 项目级状态 + 持久化到 `globalConfig.fileAttachment`
- 抽取 `<AttachmentBar>` **可复用组件**，OutlineGenerator 与工作台共用
- 工作台附件条 UI：预览 + 下载原始文件 + 替换 + 清空
- 项目加载时从 `globalConfig` 恢复附件信息

### 不包含

- Agent 对话模式（InputArea / AgentView）上传文件的纳入（语义不同——Agent 文件是对话上下文而非项目源文档，留作未来扩展）
- 替换附件时自动重新生成幻灯片（附件是"源文档引用"，幻灯片已独立生成）
- 服务器文件清理逻辑变更（沿用现有 AssetRegistry 生命周期管理）
- 数据库 schema 新增字段（复用 `globalConfig` JSON，无需 Prisma 迁移）

## 约束

| 约束 | 说明 |
|------|------|
| **无 DB 迁移** | 复用 `Project.globalConfig` JSON 存储 `{ name, type, url, size }`，不改 schema |
| **无额外延迟** | 文件上传与客户端解析**并行**执行，用户无感知 |
| **UI 一致** | OutlineGenerator 与工作台共用同一 `<AttachmentBar>` 组件 |
| **不触发重生成** | 替换附件只更新引用，不重新生成已有幻灯片 |
| **沿用现有上传** | 复用 `/api/upload` 端点 + `uploadFile()` 工具函数 + AssetRegistry 资源管理 |
| **轻量持久化** | globalConfig 只存元数据 `{ name, type, url, size }`，**不存解析内容**（预览按需从 URL 加载） |

## 技术方案

### 1. 类型定义（[src/types.ts](src/types.ts)）

新增 `ProjectAttachment` 接口：

```typescript
export interface ProjectAttachment {
  name: string;       // 原始文件名，如 "report.pdf"
  type: string;       // MIME 类型，如 "application/pdf"
  url: string;        // 服务器相对路径，如 "/uploads/up-xxx.pdf"
  size?: number;      // 文件大小（字节），可选
}
```

### 2. 文件上传与解析并行（[OutlineGenerator.tsx](src/components/OutlineGenerator.tsx)）

`processFile()` 改造——客户端解析与服务器上传**并行**执行：

```typescript
const processFile = async (file: File) => {
  // 并行：客户端解析（AI 上下文）+ 服务器上传（持久化）
  const [content, url] = await Promise.all([
    extractTextFromUpload(file),   // 现有逻辑，供 AI 生成使用
    uploadFile(file),               // 新增，返回服务器 URL
  ]);
  setAttachedFile({ name: file.name, type: file.type, content, url, size: file.size });
  setFileParsedContent(content);
};
```

### 3. `onFinish` 回调扩展（[OutlineGenerator.tsx](src/components/OutlineGenerator.tsx)）

`OutlineGeneratorProps` 增加附件传出能力。两种方案择一：

- **方案 A（推荐）**：扩展 `onFinish` 签名为 `onFinish: (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => void`
- 方案 B：新增独立回调 `onAttachmentChange`

采用方案 A——附件与幻灯片是同一次导入的两部分产出，一起传更内聚。

`handleFinish()` 中提取 `attachedFile` 的轻量元数据传出：

```typescript
const attachment: ProjectAttachment | null = attachedFile
  ? { name: attachedFile.name, type: attachedFile.type, url: attachedFile.url, size: attachedFile.size }
  : null;
onFinish(slides, attachment);
```

### 4. 项目级状态与持久化（[App.tsx](src/App.tsx)）

新增状态：

```typescript
const [projectAttachment, setProjectAttachment] = useState<ProjectAttachment | null>(null);
```

`handleOutlineImport()` 接收附件并持久化：

```typescript
const handleOutlineImport = (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => {
  if (attachment) {
    setProjectAttachment(attachment);
    // 持久化到 globalConfig.fileAttachment
    if (currentProjectIdRef.current) {
      updateProjectMutation.mutate({
        id: currentProjectIdRef.current,
        data: { globalConfig: { ...config, fileAttachment: attachment } }
      });
    }
  }
  // ... 现有幻灯片导入逻辑不变
};
```

项目加载时从 `globalConfig` 恢复（`transformProject` 或加载项目处）：

```typescript
const attachment = project.globalConfig?.fileAttachment ?? null;
setProjectAttachment(attachment);
```

### 5. 抽取 `<AttachmentBar>` 可复用组件

新建 `src/components/AttachmentBar.tsx`：

```typescript
interface AttachmentBarProps {
  attachment: ProjectAttachment;
  onPreview: () => void;
  onDownload: () => void;
  onClear: () => void;
  onReplace?: () => void;    // 工作台独有，向导不传
  variant?: 'generator' | 'workbench';  // 控制是否显示替换按钮
}
```

- **OutlineGenerator** 复用：`variant="generator"`，不传 `onReplace`
- **工作台** 复用：`variant="workbench"`，传 `onReplace`

UI 从 [OutlineGenerator.tsx:976-1009](src/components/OutlineGenerator.tsx#L976-L1009) 现有附件条迁移，保持视觉一致。

### 6. 工作台附件条集成（[App.tsx](src/App.tsx) 工作台区域）

在全局设置面板**上方**（[App.tsx:4401](src/App.tsx#L4401) `flex flex-col gap-6` 区域顶部）插入：

```tsx
{projectAttachment && (
  <AttachmentBar
    attachment={projectAttachment}
    variant="workbench"
    onPreview={() => setIsAttachmentPreviewOpen(true)}
    onDownload={() => downloadFromUrl(projectAttachment.url, projectAttachment.name)}
    onReplace={() => fileInputRef.current?.click()}
    onClear={() => handleClearAttachment()}
  />
)}
```

操作实现：

| 操作 | 实现 |
|------|------|
| **预览** | PDF：`<iframe src={url}>` 直接渲染；文本：`fetch(url)` 后 Markdown 渲染（复用 `ReactMarkdown`） |
| **下载原始文件** | `<a href={url} download={name}>`（a 标签，浏览器原生下载，得到**原始文件**） |
| **替换** | 触发隐藏 `<input type="file">` → 选文件 → `uploadFile()` → 更新 `projectAttachment` + globalConfig |
| **清空** | 确认弹窗 → `setProjectAttachment(null)` + globalConfig 移除 `fileAttachment`（不删服务器文件） |

### 数据流（完整）

```
用户选文件
  ├─→ extractTextFromUpload()  ─┐ (并行，AI 上下文)
  └─→ uploadFile() → URL ───────┘ (持久化)
        ↓
  attachedFile = { name, type, content, url, size }
        ↓
  handleFinish(slides, attachment)
        ↓
  App.tsx: setProjectAttachment(attachment)
        ↓
  持久化: globalConfig.fileAttachment = { name, type, url, size }  (不含 content)
        ↓
  工作台 <AttachmentBar attachment={projectAttachment} variant="workbench" />
        ↓
  预览: 从 url 按需加载 | 下载: a 标签原文件 | 替换: 重新 uploadFile | 清空: 移除引用
```

## 验收标准

- ✅ OutlineGenerator 上传文件后，`attachedFile` 含 `url` 字段（服务器返回）
- ✅ 文件上传与客户端解析并行，向导内不产生明显额外延迟
- ✅ 导入工作台后，附件条出现在全局设置面板上方
- ✅ 附件条显示文件名、类型、大小
- ✅ 预览：PDF 直接渲染 / 文本 Markdown 展示
- ✅ 下载：得到**原始文件**（非解析文本）
- ✅ 替换：选新文件后附件信息更新，globalConfig 同步
- ✅ 清空：附件条消失，globalConfig 移除 `fileAttachment`
- ✅ 关闭浏览器重新打开项目，附件条依然显示，可预览可下载
- ✅ `<AttachmentBar>` 组件被 OutlineGenerator 和工作台共用，视觉一致
- ✅ 现有 OutlineGenerator 向导内的附件条行为不变（回归无破坏）

## 风险与对策

| 风险 | 对策 |
|------|------|
| 上传失败导致 `url` 缺失 | `Promise.allSettled` 替代 `Promise.all`——上传失败时降级为仅本地解析（`url` 为空，工作台下载按钮禁用并提示） |
| 大文件上传耗时影响向导体验 | 上传与解析并行；上传中显示 loading 状态；`handleFinish` 时若上传未完成则等待 |
| globalConfig JSON 过大 | 只存元数据（`{ name, type, url, size }`，约 100 字节），不存解析内容 |
| 替换后旧文件成孤儿 | 沿用 AssetRegistry 现有清理机制（孤儿资源 7 天后清理），不额外处理 |
| 历史项目无 `fileAttachment` | `project.globalConfig?.fileAttachment ?? null` 安全降级，旧项目无附件条（符合预期） |
| 工作台预览大 PDF 卡顿 | iframe 懒加载 + loading 占位；超大文件提示"建议下载后查看" |

## 关联

- 数据断连源头：[OutlineGenerator.tsx:887](src/components/OutlineGenerator.tsx#L887) `originalFile: null` 硬编码
- 向导附件条（UI 参考源）：[OutlineGenerator.tsx:976-1009](src/components/OutlineGenerator.tsx#L976-L1009)
- 导入入口：[App.tsx:1714](src/App.tsx#L1714) `handleOutlineImport`
- 工作台渲染区：[App.tsx:4742](src/App.tsx#L4742) `items.map(ResultCard)`
- 上传工具函数：[src/api/client.ts](src/api/client.ts) `uploadFile()`
- 上传端点：[server/src/routes/upload.routes.ts](server/src/routes/upload.routes.ts) `POST /api/upload`
- 资源管理：[server/src/services/resource.service.ts](server/src/services/resource.service.ts) `registerUserUpload()`
