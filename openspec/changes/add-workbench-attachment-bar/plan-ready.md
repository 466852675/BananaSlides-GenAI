# 实现计划：add-workbench-attachment-bar

## 来源
- 提案：openspec/changes/add-workbench-attachment-bar/proposal.md
- 设计：openspec/changes/add-workbench-attachment-bar/design.md
- 规格：openspec/changes/add-workbench-attachment-bar/specs/
- 任务：openspec/changes/add-workbench-attachment-bar/tasks.md

## Goal

当用户通过 OutlineGenerator 上传文件生成 PPT 后，导入工作台时能在全局设置面板上方看到附件条，显示文件名/类型/大小，可预览（PDF/文本/不支持提示三档降级）、下载原始文件、替换附件、清空附件。重新打开项目后附件信息依然存在。向导内的附件下载也保持一致（有 url 时下载原文件）。

## Non-Goals
- Agent 对话模式文件纳入（语义不同）
- 替换附件触发重新生成幻灯片
- DB schema 新增字段（复用 globalConfig JSON）
- 附件版本历史（单附件，替换即覆盖）
- 服务器文件清理逻辑变更（沿用 AssetRegistry）

## Source Coverage

| OpenSpec 来源 | 验收点 | 对应 implementation slice |
|---------------|--------|---------------------------|
| `specs/spec-001-attachment-types.md` / Req: ProjectAttachment 接口 | 新增类型定义，`ProjectSession.attachment` 字段 | Slice 1 |
| `specs/spec-001-attachment-types.md` / Req: ProjectSession 扩展 | TS 编译通过，类型正确导出 | Slice 1 |
| `specs/spec-002-outline-upload.md` / Req: 并行上传 | `processFile` 中 `Promise.allSettled([parse, upload])`，uploadParams 条件包含 projectId | Slice 2 |
| `specs/spec-002-outline-upload.md` / Req: attachedFile 扩展 | `attachedFile` 含 `url`/`size` | Slice 2 |
| `specs/spec-002-outline-upload.md` / Req: onFinish 签名扩展 | `onFinish(slides, attachment?)`，attachedFile 存在即传出（url 可空） | Slice 2 |
| `specs/spec-002-outline-upload.md` / Req: 向导下载一致性 | 有 url 时下载原文件，回退解析文本 | Slice 2 |
| `specs/spec-002-outline-upload.md` / Scenario: 上传失败降级 | warning toast + url="" 上传失败不阻断解析 | Slice 2 |
| `specs/spec-002-outline-upload.md` / Scenario: 导出工作台降级附件 | attachedFile 存在但 url 空 → 传出 url='' 附件 → 工作台降级显示 | Slice 2 |
| `specs/spec-003-attachment-bar-component.md` / Req: 组件接口 | AttachmentBar 组件接收 variant/回调 props | Slice 3 |
| `specs/spec-003-attachment-bar-component.md` / Req: url 为空降级 | 显示红色警告图标 + 预览/下载禁用 + tooltip | Slice 3 |
| `specs/spec-003-attachment-bar-component.md` / Req: variant 差异 | workbench 显示替换按钮，generator 不显示 | Slice 3 |
| `specs/spec-003-attachment-bar-component.md` / Req: 文件大小展示 | B/KB/MB 格式化，size 缺失不显示 | Slice 3 |
| `specs/spec-003-attachment-bar-component.md` / Req: 向导迁移 | OutlineGenerator 内联附件条替换为 `<AttachmentBar>` | Slice 3 |
| `specs/spec-004-workbench-integration.md` / Req: 项目级状态 | App.tsx `projectAttachment` state | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: 持久化 | `globalConfig.fileAttachment` 写入/读取 | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: transformProject 提取（防污染） | `project.attachment` 从 globalConfig 恢复，提取后 delete fileAttachment | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: handleOutlineImport 两个分支 | dashboard 暂存→创建后持久化（传 newConfig）；workbench 直接持久化+替换确认(danger) | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: 持久化 configOverride | persistAttachment 支持 configOverride，避免新建项目闭包 config 陈旧 | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: 工作台附件条渲染 | 全局设置上方 `<AttachmentBar variant="workbench">` | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: 操作实现 | 预览/下载/替换/清空四操作 | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Req: 预览三档降级 | txt/md → Markdown, pdf → iframe, 其他 → 提示下载 | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Scenario: 替换不触发重生成 | tooltip + toast 文案不含"生成" | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Scenario: 上传失败降级 | 附件条显示 + 预览/下载禁用 + 红色警告图标 | Slice 4 |
| `specs/spec-004-workbench-integration.md` / Scenario: 重复导入替换确认 | 已有附件时弹出确认弹窗 | Slice 4 |
| `tasks.md` / Task 6 | 回归验证全部通过 | Slice 5 |

## File Responsibility Map

| 文件 | 操作 | 责任 | 相关 slice |
|------|------|------|------------|
| `src/types.ts` | modify | 新增 `ProjectAttachment` 接口，`ProjectSession.attachment` 字段 | Slice 1 |
| `src/components/OutlineGenerator.tsx` | modify | `processFile` 并行上传 + `onFinish` 扩展 + 下载一致性 + 迁移复用 AttachmentBar | Slice 2, 3 |
| `src/components/AttachmentBar.tsx` | create | 可复用附件条组件（variant 控制替换按钮；url 为空时降级显示红色警告） | Slice 3 |
| `src/api/projects.ts` | modify | `transformProject` 提取 `attachment` 并 **delete fileAttachment** 防污染 | Slice 4 |
| `src/App.tsx` | modify | projectAttachment state + serializeGlobalConfig 桥接 + persistAttachment + 加载恢复 + 附件条渲染 + handleCreateProjectFromOutline 增加 attachment 参数 + 替换确认弹窗 + 四操作实现 | Slice 4 |

## Implementation Slices

### Slice 1: 类型定义（~3min）

- **来源：** specs/spec-001-attachment-types.md
- **目标：** 建立 ProjectAttachment 类型和 ProjectSession 扩展，供后续所有 slice 使用
- **依赖：** 无
- **改动文件：**
  - Modify: `src/types.ts`
- **TDD 计划：** 项目无前端单元测试覆盖类型层，直接实现后 `npm run build` 验证
  1. 在 `src/types.ts` 的 `StoredResource` 定义后新增 `ProjectAttachment` 接口
  2. `ProjectSession` 接口增加 `attachment?: ProjectAttachment | null`
- **验证命令：**
  - `npm run build` — 类型检查通过，无 TS 错误
- **完成标准：**
  - `ProjectAttachment` 从 `src/types.ts` 导出（name/type/url/size?）
  - `ProjectSession` 含 `attachment` 可选字段
- **风险/回滚：** 纯新增类型字段，无运行时影响。回滚：删除新增代码

---

### Slice 2: OutlineGenerator 并行上传 + 附件传出 + 下载一致性（~20min）

- **来源：** specs/spec-002-outline-upload.md
- **目标：** `processFile` 并行上传到服务器；`onFinish` 传出附件；向导下载原始文件
- **依赖：** Slice 1（ProjectAttachment 类型）
- **改动文件：**
  - Modify: `src/components/OutlineGenerator.tsx`
- **TDD 计划：**
  1. `processFile` 改造：构建 `uploadParams`（`projectId` 可能 undefined，条件包含避免 FormData 追加 "undefined"），`Promise.allSettled([extractTextFromUpload, uploadFile])` 并行
  2. `attachedFile` state 扩展 `url: string` 和 `size: number`
  3. 上传失败降级：url="" + `onShowToast('文件上传失败，附件将无法在工作台预览/下载', 'warning')`
  4. `OutlineGeneratorProps.onFinish` 签名扩展：`(slides: GeneratedSlide[], attachment?: ProjectAttachment | null) => void`
  5. `handleFinish` 提取 `{ name, type, url, size }`，**只要 `attachedFile` 存在就传出**（url 可能为空 → 工作台降级显示），只有无文件时传 null
  6. `handleDownloadAttachment` 增强：有 url 时下载原始文件（a 标签），回退到解析文本
  7. 确认 `onFinish` 调用处（App.tsx `handleOutlineImport`）TS 编译通过（暂不实现逻辑，Slice 4 处理）
- **验证命令：**
  - `npm run build` — 编译通过
- **完成标准：**
  - `processFile` 上传文件后 `attachedFile.url` 非空
  - 上传失败时 url 为空 + warning toast，但 `attachedFile` 仍存在（附件信息传出供降级显示）
  - `onFinish` 签名含附件参数
  - 向导内下载：有 url 时下载原始文件，无 url 时下载解析文本
- **风险/回滚：** uploadFile 异步失败不影响解析（Promise.allSettled）。回滚：恢复 processFile 和 onFinish 到原状

---

### Slice 3: AttachmentBar 可复用组件（~15min）

- **来源：** specs/spec-003-attachment-bar-component.md
- **目标：** 抽取 `<AttachmentBar>` 组件，OutlineGenerator 迁移复用
- **依赖：** Slice 1（ProjectAttachment 类型）
- **改动文件：**
  - Create: `src/components/AttachmentBar.tsx`
  - Modify: `src/components/OutlineGenerator.tsx`（替换内联附件条为 `<AttachmentBar>`）
- **TDD 计划：**
  1. 新建 `src/components/AttachmentBar.tsx`
     - Props: `attachment: ProjectAttachment`, `variant: 'generator' | 'workbench'`, `onPreview`, `onDownload`, `onClear?`, `onReplace?`
     - 从 OutlineGenerator.tsx:976-1009 迁移附件条 JSX
     - variant 控制替换按钮显隐
     - 文件大小格式化（B/KB/MB）
     - **url 为空降级**：红色 `AlertCircle` 图标 + 预览/下载按钮禁用 + tooltip「文件上传失败，暂不可用」
  2. OutlineGenerator 中替换内联附件条为 `<AttachmentBar variant="generator">`
- **验证命令：**
  - `npm run build` — 编译通过
- **完成标准：**
  - AttachmentBar 导出为默认组件
  - `variant="generator"` 渲染预览/下载/清空三按钮
  - `variant="workbench"` 渲染预览/下载/替换/清空四按钮
  - OutlineGenerator 附件条行为与迁移前一致（回归无破坏）
- **风险/回滚：** 纯 UI 抽取，不引入新功能。回滚：删除组件 + 恢复内联 JSX

---

### Slice 4: App.tsx 工作台附件条集成 + 持久化（~30min）

- **来源：** specs/spec-004-workbench-integration.md
- **目标：** 工作台渲染附件条，全操作可用，持久化恢复
- **依赖：** Slice 1, 2, 3（类型 + 传出 + 组件）
- **改动文件：**
  - Modify: `src/App.tsx`
  - Modify: `src/api/projects.ts`（transformProject 提取 attachment）
- **TDD 计划：**
  1. `src/api/projects.ts` `transformProject`：
     - 从 `globalConfig.fileAttachment` 提取 → `project.attachment`
     - **提取后 `delete (globalConfig as any).fileAttachment`** 防止污染 StyleConfig
  2. `src/App.tsx`：
     - 新增 `projectAttachment` state
     - `serializeGlobalConfig(styleConfig, attachment)` 辅助函数：`JSON.stringify({...styleConfig, fileAttachment})` 桥接类型
     - `persistAttachment(attachment, configOverride?)` 使用 `serializeGlobalConfig` 避免 TS 冲突；`configOverride` 用于新建项目场景
     - `handleOutlineImport` 接收 attachment 参数，分两支：
       - **dashboard**：传给 `handleCreateProjectFromOutline(slides, title, attachment)`，项目创建后持久化
       - **workbench**：如果已有附件，`showConfirm(..., 'danger')` 替换确认（ConfirmDialog 只支持 danger/info）；否则直接 `doSetAttachment`
     - `doSetAttachment(attachment, configOverride?)` 公共函数：`setProjectAttachment` + `persistAttachment`
     - `handleCreateProjectFromOutline` 增加 `attachment?` 参数，创建成功后调用 `doSetAttachment(attachment, newConfig)` —— **必须传 newConfig**，避免闭包 config 陈旧覆盖新项目样式
     - 项目加载 useEffect: `setProjectAttachment(project?.attachment ?? null)`
     - 工作台全局设置上方渲染 `<AttachmentBar variant="workbench">`（条件：workbench + !previewSnapshot）
     - 隐藏 `<input type="file" ref={attachmentFileInputRef}>` 供替换触发
     - 操作实现：
       - `downloadAttachment`: a 标签下载原始文件
       - `handleReplaceAttachment`: uploadFile → 更新 state + persist + toast "附件已替换为 xxx"；替换按钮 tooltip "替换源文档（不影响已生成的幻灯片）"
       - `handleClearAttachment`: showConfirm "确定移除源文件附件吗？此操作不影响已生成的幻灯片内容。" → 清空
       - 预览模态：三档降级（pdf iframe / 文本 Markdown / 不支持提示下载）
- **验证命令：**
  - `npm run build` — 编译通过
  - `cd server && bun test` — 后端测试通过
- **完成标准：**
  - 上传文件 → 生成 → 导入 → 工作台附件条出现
  - 从 Dashboard 新建项目（新项目来源）→ 附件持久化，刷新后重现
  - 从 Workbench 追加（已有项目）→ 附件持久化，刷新后重现
  - 已有附件时再次导入 → 弹出替换确认弹窗
  - 替换 → 附件更新 + toast
  - 清空 → 确认弹窗 → 附件条消失
  - 刷新页面 → 附件条重现
  - 上传失败 → 附件条显示文件名 + 红色警告图标 + 预览/下载禁用 + tooltip
  - 历史项目 → 无附件条（降级）
  - 预览 PDF 文件用 iframe 渲染
  - 预览 txt/md 文件用 Markdown 渲染
  - 预览 docx 等格式显示"暂不支持"
  - 下载得到原始文件（非解析 .txt）
- **风险/回滚：** globalConfig JSON 结构变化不影响旧项目解析（已有 `catch {}` 容错）。回滚：移除 App.tsx attachment 相关代码 + projects.ts transformProject 恢复

---

### Slice 5: 回归验证 + 收尾（~10min）

- **来源：** tasks.md Task 6
- **目标：** 全验收标准通过，无回归
- **依赖：** Slice 1-4
- **改动文件：** 无（纯验证）
- **TDD 计划：**
  1. `npm run build` — 前端构建
  2. `cd server && bun test` — 后端测试
  3. `npx vitest run` — 前端单元测试
  4. 手动 E2E 回归：
     - 向导附件条预览/下载/清空行为不变
     - 一句话生成 → 无附件条
     - 上传失败 → warning toast + 工作台附件条降级显示（红色警告图标 + 预览/下载禁用 + tooltip）
     - 工作台替换/清空不影响已有幻灯片
     - Dashboard 新建项目 → 附件持久化 + 新项目样式配置不被旧 config 覆盖
  5. 验收标准逐项核对
- **验证命令：**
  - `npm run build` — 构建成功
  - `cd server && bun test` — 后端测试通过
  - `npx vitest run` — 前端测试通过
- **完成标准：**
  - proposal.md 所有 ✅ 项通过
  - 无 TS 编译错误
  - 后端测试无回归
  - 前段单元测试无回归
- **风险/回滚：** 无

## Verification Plan

- **单元/集成验证：** `npx vitest run` + `cd server && bun test`
- **类型/构建验证：** `npm run build`
- **手动验证：**
  1. 上传文件（pdf/txt/docx 三类型）→ 生成 → 导入工作台 → 附件条
  2. 预览（PDF iframe / 文本 Markdown / docx 提示）
  3. 下载原始文件
  4. 替换附件
  5. 清空附件
  6. 刷新 → 附件重现
  7. 打开历史项目 → 无附件
  8. 一句话生成（无文件）→ 无附件
  9. 模拟上传失败 → 附件条显示文件名 + 红色警告图标 + 预览/下载禁用 + tooltip
  10. Dashboard 新建项目流程 → 附件持久化，刷新后重现
  11. 已有附件时二次导入 → 替换确认弹窗
  12. 上传失败时 → globalConfig 不包含 fileAttachment（transformProject delete 生效+无污染）

## Blockers / Clarifications

无

## Superpowers Handoff
- `writing-plans` 必须基于本文件生成 `docs/superpowers/plans/YYYY-MM-DD-add-workbench-attachment-bar.md`
- 详细实现计划必须使用 checkbox，并把每个 slice 展开为 2-5 分钟步骤
- 详细实现计划不得省略 Source Coverage 中的任何验收点
