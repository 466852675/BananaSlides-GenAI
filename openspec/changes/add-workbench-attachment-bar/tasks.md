# 任务清单：项目工作台附件条

> 按执行依赖排序（非功能模块排序）。每个任务引用对应 spec。
> 约束：无 DB 迁移（复用 globalConfig JSON），并行上传不增加延迟，UI 复用 AttachmentBar 组件。

---

## Task 1：类型定义（SPEC-001）

**目标：** 建立 ProjectAttachment 类型和 ProjectSession 扩展
**对应 spec：** specs/spec-001-attachment-types.md
**步骤：**
1. `src/types.ts` 新增 `ProjectAttachment` 接口（`name` / `type` / `url` / `size?`）
2. `ProjectSession` 接口增加 `attachment?: ProjectAttachment | null` 字段

**验证：**
- `npm run build` 类型检查通过
- `ProjectAttachment` 被导出，`ProjectSession` 含 `attachment`

**依赖：** 无

---

## Task 2：OutlineGenerator 并行上传 + 附件传出（SPEC-002）

**目标：** processFile 并行上传文件到服务器；handleFinish 通过 onFinish 传出附件
**对应 spec：** specs/spec-002-outline-upload.md
**步骤：**
1. `OutlineGenerator.tsx` `processFile()` 改造：构建 `uploadParams`（projectId 可能 undefined，条件包含避免 FormData 追加 "undefined"），`Promise.allSettled([extractTextFromUpload, uploadFile])` 并行
2. `attachedFile` 状态扩展 `url` 和 `size` 字段
3. 上传失败降级：`url=''` + warning toast「文件上传失败，附件将无法在工作台预览/下载」
4. `OutlineGeneratorProps.onFinish` 签名扩展为 `(slides, attachment?) => void`
5. `handleFinish()` 提取 `{ name, type, url, size }`（不含 content）；**只要 `attachedFile` 存在就传出**（url 可能为空 → 工作台降级显示），只有无文件时才传 null
6. 向导内 `handleDownloadAttachment` 增强：有 `url` 时下载原始文件，回退到解析文本（避免向导/工作台下载体验割裂）
7. 确认向导内预览模态（Markdown 渲染）行为保留不变

**验证：**
- `npm run build` 编译通过
- 手动：上传文件 → attachedFile 含 url
- 手动（降级）：mock `/api/upload` 500 → 解析仍成功 + warning toast

**依赖：** Task 1（ProjectAttachment 类型）

---

## Task 3：projects.ts 序列化/反序列化附件（SPEC-004 部分）

**目标：** transformProject 提取 attachment；持久化路径打通
**对应 spec：** specs/spec-004-workbench-integration.md（持久化部分）
**步骤：**
1. `src/api/projects.ts` `transformProject`：从解析后的 globalConfig 提取 `fileAttachment` → `attachment` 字段，**提取后 `delete (globalConfig as any).fileAttachment`** 防止污染 StyleConfig
2. 确认 `useUpdateProject` / `useCreateProject` 序列化 globalConfig 时保留 fileAttachment（globalConfig 整体 JSON.stringify，无需额外处理）
3. 历史项目无 fileAttachment → `attachment = null`（利用现有 `catch {}` 容错）

**验证：**
- `npm run build` 编译通过
- `cd server && bun test` 后端测试通过（globalConfig 序列化无破坏）
- 手动：DB 中写入含 fileAttachment 的 globalConfig → transformProject 正确提取
- 验证：transformProject 返回的 globalConfig.base **不含** fileAttachment 键（无污染）

**依赖：** Task 1（ProjectAttachment 类型）

---

## Task 4：AttachmentBar 可复用组件（SPEC-003）

**目标：** 抽取可复用附件条组件，OutlineGenerator 迁移复用
**对应 spec：** specs/spec-003-attachment-bar-component.md
**步骤：**
1. 新建 `src/components/AttachmentBar.tsx`，Props 含 `variant` / `onPreview` / `onDownload` / `onClear?` / `onReplace?`
2. 从 [OutlineGenerator.tsx:976-1009](src/components/OutlineGenerator.tsx#L976-L1009) 迁移附件条 JSX 到组件
3. `variant="workbench"` 时显示替换按钮（`RefreshCw` 图标）
4. 文件大小格式化展示（B/KB/MB），size 缺失时不显示
5. OutlineGenerator 附件条替换为 `<AttachmentBar variant="generator">`

**验证：**
- `npm run build` 编译通过
- 手动：向导附件条行为与迁移前一致（预览/下载/清空回归无破坏）
- 手动：工作台 variant 显示四按钮

**依赖：** Task 1（ProjectAttachment 类型）

---

## Task 5：App.tsx 工作台附件条集成 + 持久化（SPEC-004）

**目标：** 工作台渲染附件条，支持预览/下载/替换/清空 + 持久化恢复
**对应 spec：** specs/spec-004-workbench-integration.md
**步骤：**
1. App.tsx 新增 `projectAttachment` state
2. `serializeGlobalConfig(styleConfig, attachment)` 辅助函数：`JSON.stringify({...styleConfig, fileAttachment})` 桥接类型（避免 `{...config, fileAttachment}` TS 冲突）
3. `persistAttachment` 使用 `serializeGlobalConfig`，**支持可选 `configOverride` 参数**，调 `updateProjectMutation`
4. `doSetAttachment(attachment, configOverride?)` 公共函数：`setProjectAttachment` + `persistAttachment`
5. `handleOutlineImport` 扩展接收 attachment，分两支：
   - **dashboard**：传给 `handleCreateProjectFromOutline(slides, title, attachment)`，`handleCreateProjectFromOutline` 增加 `attachment?` 参数，**项目创建成功后调用 `doSetAttachment(attachment, newConfig)`**（必须传 newConfig，避免闭包 config 陈旧覆盖新项目样式）
   - **workbench**：如果已有附件且新附件非空，`showConfirm('替换附件', '当前项目已有附件 xxx，是否替换为新文件 yyy？此操作不影响已生成的幻灯片。', callback, 'danger')`（ConfirmDialog 只支持 danger/info）→ `doSetAttachment`；无已有附件时直接 `doSetAttachment`
6. 项目加载 useEffect 增加 `setProjectAttachment(project?.attachment ?? null)`
7. 工作台全局设置面板上方渲染 `<AttachmentBar variant="workbench">`（条件：viewMode=workbench && !previewSnapshot）
8. 实现 `downloadAttachment`（a 标签下载原始文件）、`handleReplaceAttachment`（uploadFile + 更新 + tooltip "替换源文档（不影响已生成的幻灯片）"+ toast "附件已替换为 xxx"）、`handleClearAttachment`（确认弹窗「确定移除源文件附件吗？此操作不影响已生成的幻灯片内容。」→ 清空）、预览模态（三档：PDF iframe / 文本 Markdown / 不支持类型提示下载）
9. 隐藏 `<input type="file">` + ref 供替换触发

**验证：**
- `npm run build` 编译通过
- 手动 E2E 全流程：上传→生成→导入→附件条→预览→下载原文件→替换→清空→刷新重现→历史项目无附件条
- Dashboard 新建项目：上传文件→生成→创建项目→附件持久化→Ctrl+F5→附件条重现
- Workbench 追加：已有附件时再次导入→弹出替换确认弹窗

**依赖：** Task 1, 2, 3, 4

---

## Task 6：回归验证 + 收尾

**目标：** 确保无回归，验收标准全部满足
**对应 spec：** proposal.md 验收标准
**步骤：**
1. `npm run build` 前端构建通过
2. `cd server && bun test` 后端测试通过
3. `npx vitest run` 前端单元测试通过
4. 手动回归：
   - OutlineGenerator 向导附件条预览/下载/清空不变
   - 「一句话生成」无文件路径 → 工作台无附件条（降级）
   - 上传失败 → warning toast + 工作台附件条降级显示（红色警告图标 + 预览/下载禁用 + tooltip）
   - 工作台替换/清空不影响已有幻灯片
   - Dashboard 新建项目流程 → 附件持久化 + 新项目样式配置不被旧 config 覆盖
5. 验收标准逐项核对（见 proposal.md 验收标准章节）

**验证：** proposal.md 所有 ✅ 项通过

**依赖：** Task 5
