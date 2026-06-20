---
title: SPEC-002 — OutlineGenerator 并行上传与附件传出
status: draft
capability: outline-generator-attachment
---

# SPEC-002: OutlineGenerator 并行上传与附件传出

## 变更类型

修改（行为增强）

## 改动文件

- `src/components/OutlineGenerator.tsx` — `processFile()` 并行上传；`handleFinish()` 传出附件；Props 扩展

## 当前行为

`processFile()`（[OutlineGenerator.tsx:283-327](src/components/OutlineGenerator.tsx#L283)）仅客户端解析：
```typescript
const { text } = await extractTextFromUpload(file, ...);
setAttachedFile({ name: file.name, type: file.type, content: text });
// 无 url，无上传
```

`handleFinish()`（[OutlineGenerator.tsx:860-906](src/components/OutlineGenerator.tsx#L860)）硬编码 `originalFile: null`，`attachedFile` 不外传。

`onFinish` 签名：`(slides: GeneratedSlide[]) => void`

## 目标行为

### Requirement: 并行上传

`processFile()` 中客户端解析与服务器上传**并行**执行，用户不感知额外延迟：

```typescript
const [parseResult, uploadResult] = await Promise.allSettled([
  extractTextFromUpload(file, appSettings, toastCb),
  uploadFile(file, { purpose: 'source-document', projectId }),
]);
```

**降级**：使用 `Promise.allSettled`，上传失败不阻断解析：
- 解析必须成功（AI 生成依赖）
- 上传失败时 `url = ''`，显示 warning toast「文件上传失败，附件将无法在工作台下载」

### Requirement: attachedFile 扩展

`attachedFile` 状态从 `{ name, type, content }` 扩展为 `{ name, type, content, url, size }`：
- `url: string` — 服务器返回路径，上传失败时为空字符串
- `size: number` — `file.size` 字节数

### Requirement: onFinish 签名扩展

```typescript
onFinish: (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => void;
```

`handleFinish()` 提取轻量元数据传出（不含 content）：
```typescript
const attachment: ProjectAttachment | null = attachedFile?.url
  ? { name: attachedFile.name, type: attachedFile.type, url: attachedFile.url, size: attachedFile.size }
  : null;
onFinish(slides, attachment);
```

**规则**：`url` 为空时 `attachment = null`（工作台降级为无附件条）。

### Requirement: 向导内行为不变

现有向导附件条（预览/下载/清空）行为保持不变。`handleDownloadAttachment` 仍下载解析文本（向导内 content 可用）。向导附件条后续迁移为复用 `<AttachmentBar variant="generator">`（见 SPEC-003）。

## 场景

### Scenario: 正常上传

- **Given** 用户在文件标签页选择 report.pdf
- **When** `processFile` 执行
- **Then** 解析与上传并行完成
- **And** `attachedFile.url` 为非空服务器路径
- **And** toast 显示「文件解析成功」

### Scenario: 上传失败降级

- **Given** `/api/upload` 返回 500
- **When** `processFile` 的 `Promise.allSettled` 完成
- **Then** 解析成功（AI 生成不受影响）
- **And** `attachedFile.url` 为空字符串
- **And** toast 显示「文件上传失败，附件将无法在工作台下载」warning

### Scenario: 导出工作台带附件

- **Given** `attachedFile.url` 非空
- **When** 用户点击「完成并导入工作台」
- **Then** `onFinish` 被调用，第二参数为 `ProjectAttachment` 对象（含 name/type/url/size，不含 content）

### Scenario: 导出工作台无附件

- **Given** 用户使用「一句话生成」（无文件上传），或上传失败 url 为空
- **When** `handleFinish` 执行
- **Then** `onFinish` 第二参数为 `null`

## 验证方式

- `npm run build` 编译通过
- 手动：上传文件后检查 `attachedFile` 含 url（devtools React DevTools 或 console.log）
- 手动：上传成功导入工作台后，工作台出现附件条
- 手动（降级）：mock `/api/upload` 返回 500，确认解析仍成功 + warning toast
