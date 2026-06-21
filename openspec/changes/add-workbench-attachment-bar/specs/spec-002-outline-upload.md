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
// projectId 可能 undefined（dashboard 新建场景），需条件包含避免 FormData 追加 "undefined" 字符串
const uploadParams: Record<string, string> = { purpose: 'source-document' };
if (projectId) uploadParams.projectId = projectId;

const [parseResult, uploadResult] = await Promise.allSettled([
  extractTextFromUpload(file, appSettings, (msg, type) => {
    const toastType = type === 'loading' ? 'loading' : type === 'error' ? 'error' : 'success';
    onShowToast(msg, toastType);
  }),
  uploadFile(file, uploadParams),
]);
```

**降级**：使用 `Promise.allSettled`，上传失败不阻断解析：
- 解析必须成功（AI 生成依赖）
- 上传失败时 `url = ''`，显示 warning toast「文件上传失败，附件将无法在工作台预览/下载」

### Requirement: attachedFile 扩展

`attachedFile` 状态从 `{ name, type, content }` 扩展为 `{ name, type, content, url, size }`：
- `url: string` — 服务器返回路径，上传失败时为空字符串
- `size: number` — `file.size` 字节数

### Requirement: onFinish 签名扩展

```typescript
onFinish: (slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => void;
```

`handleFinish()` 提取轻量元数据传出（不含 content）。**关键：只要 `attachedFile` 存在就传出，即使 url 为空**——这样上传失败时工作台仍能降级显示（红色警告图标 + 禁用按钮），用户可「替换」修复：

```typescript
const attachment: ProjectAttachment | null = attachedFile
  ? { name: attachedFile.name, type: attachedFile.type, url: attachedFile.url || '', size: attachedFile.size }
  : null;
onFinish(slides, attachment);
```

**规则**：
- `attachedFile` 存在（用户上传了文件） → 传出附件对象，`url` 可能为空字符串（上传失败） → 工作台降级显示
- `attachedFile` 为 null（「一句话生成」无文件） → 传 null → 工作台无附件条

### Requirement: 向导内行为不变

现有向导附件条（预览/下载/清空）行为基本不变，但**下载逻辑需增强**：

`handleDownloadAttachment` 增加判断：如果 `attachedFile.url` 存在，直接通过 a 标签下载**原始文件**（与工作台一致）；否则回退到下载解析文本：

```typescript
const handleDownloadAttachment = () => {
  if (!attachedFile) return;
  if (attachedFile.url) {
    // 有服务器文件 → 下载原始文件
    const link = document.createElement('a');
    link.href = attachedFile.url;
    link.download = attachedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (attachedFile.content) {
    // 回退：下载解析文本（现有逻辑）
    const blob = new Blob([attachedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parsed_${attachedFile.name}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
```

**理由**：避免「同一个上传文件，在向导内下载是 .txt，在工作台下载是原始文件」的体验割裂。向导/工作台行为一致：有 url 时下载原文件，无 url 时降级下载解析文本。

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

- **Given** `attachedFile` 存在且 `url` 非空
- **When** 用户点击「完成并导入工作台」
- **Then** `onFinish` 被调用，第二参数为 `ProjectAttachment` 对象（含 name/type/url/size，不含 content）
- **And** 工作台附件条正常显示（预览/下载可用）

### Scenario: 导出工作台降级附件（上传失败）

- **Given** 用户上传了文件但 `/api/upload` 失败（`attachedFile` 存在，`url` 为空字符串）
- **When** 用户点击「完成并导入工作台」
- **Then** `onFinish` 第二参数为 `ProjectAttachment`（`url: ''`）
- **And** 工作台附件条降级显示（红色 `AlertCircle` 图标 + 预览/下载禁用 + tooltip「文件上传失败，暂不可用」）
- **And** 「替换」按钮可用，用户可重新上传修复

### Scenario: 导出工作台无附件

- **Given** 用户使用「一句话生成」（无文件上传，`attachedFile` 为 null）
- **When** `handleFinish` 执行
- **Then** `onFinish` 第二参数为 `null`
- **And** 工作台无附件条

## 验证方式

- `npm run build` 编译通过
- 手动：上传文件后检查 `attachedFile` 含 url（devtools React DevTools 或 console.log）
- 手动：上传成功导入工作台后，工作台出现附件条
- 手动（降级）：mock `/api/upload` 返回 500，确认解析仍成功 + warning toast
