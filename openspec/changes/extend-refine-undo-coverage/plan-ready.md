# 实现计划：extend-refine-undo-coverage

## 来源
- 提案：openspec/changes/extend-refine-undo-coverage/proposal.md
- 设计：openspec/changes/extend-refine-undo-coverage/design.md
- 规格：openspec/changes/extend-refine-undo-coverage/specs/slide-refine/spec.md、specs/design-requirements-refine/spec.md、specs/outline-input-refine/spec.md
- 任务：openspec/changes/extend-refine-undo-coverage/tasks.md

## Goal
扩展撤回功能覆盖到设计要求 + OutlineGenerator 主题/文件内容两个 AI修饰入口，并修正 ResultCard 边界 a 为"手动编辑不清空锚点"。设计要求撤回采用 `config.previousRequirements` 持久化方案（与 ResultCard 的 `Slide.previousContent` 对称，刷新后撤回仍在）；OutlineGenerator 用本地 ref（与模态框数据生命周期一致）。

## Non-Goals
- AgentGlobalConfigModal（被 App.tsx 撤回覆盖）
- StyleTemplateManager（P2 后续排期）
- AgentView 输入框 / QuickTemplateModal（不适合撤回）
- 后端 / schema 变更（`globalConfig` 是 JSON，加 `previousRequirements` 子字段不破坏 schema）

## Source Coverage

| OpenSpec 来源 | 验收点 | 对应 slice |
|---|---|---|
| slide-refine / MODIFIED "手动编辑不隐藏" | ResultCard 手动编辑 textarea 后 previousContent 保留、撤回按钮仍显示 | Slice 1 |
| design-requirements-refine / "修饰触发存旧值" | handleRefineRequirements 开始时 handleConfigChange("previousRequirements", ...) 入库 | Slice 2 |
| design-requirements-refine / "点击撤回" | 撤回按钮恢复 requirements + 清空 previousRequirements + 入库 | Slice 2 |
| design-requirements-refine / "手动编辑不清空" | 设计要求手动编辑后 previousRequirements 保留 | Slice 2 |
| design-requirements-refine / "再修饰覆盖" | 再修饰时 previousRequirements 更新为本次前值 | Slice 2 |
| design-requirements-refine / "只读/修饰中不显示" | previewSnapshot / isRefiningRequirements 时按钮隐藏 | Slice 2 |
| design-requirements-refine / "刷新后仍可撤回（持久化）" | previousRequirements 随 globalConfig 入库，刷新后 transformProject JSON.parse 带出，撤回按钮仍在 | Slice 2 |
| outline-input-refine / "主题修饰存旧值" | handleRefine text Tab 存 previousTopicRef | Slice 3 |
| outline-input-refine / "文件内容修饰存旧值" | handleRefine file Tab 存 previousFileContentRef | Slice 3 |
| outline-input-refine / "点击主题/文件内容撤回" | 两个撤回按钮恢复 + 清 ref | Slice 3 |
| outline-input-refine / "手动编辑不清空" | 对应 ref 保留 | Slice 3 |
| outline-input-refine / "再修饰覆盖" | 对应 ref 更新（单步）| Slice 3 |
| outline-input-refine / "清空按钮清空锚点" | Tab1/Tab2 清空同步清对应 ref | Slice 3 |
| outline-input-refine / "修饰中不显示" | isRefining 时按钮隐藏 | Slice 3 |
| outline-input-refine / "模态框关闭后不可撤回" | 本地 ref 随组件销毁（天然满足）| — |

## File Responsibility Map

| 文件 | 操作 | 责任 | 相关 slice |
|---|---|---|---|
| `src/components/ResultCard.tsx` | modify | textarea onChange 去掉 previousContent: undefined | Slice 1 |
| `src/components/ResultCard.test.tsx` | modify | 边界 a 用例改为"不清空" | Slice 1 |
| `src/types.ts` | modify | `StyleConfig` 加 `previousRequirements?: string` | Slice 2 |
| `src/App.tsx` | modify | import Undo2 + handleRefineRequirements 存旧值 + handleUndoRequirementsRefine + 撤回按钮 JSX（无 ref/state） | Slice 2 |
| `src/__tests__/components/RequirementsRefineUndo.test.tsx`（新建） | create | 设计要求撤回用例（含刷新持久验证） | Slice 2 |
| `src/components/OutlineGenerator.tsx` | modify | import Undo2 + 两个 ref + handleRefine 存旧值 + 两个撤回按钮 + 清空同步 | Slice 3 |
| `src/components/OutlineGenerator.test.tsx`（新建，若不存在） | create | OutlineGenerator 撤回用例 | Slice 3 |

## 已验证的关键假设（无 Blocker）

- App.tsx `handleConfigChange`（:1597）是 partial merge 且触发 auto-save（add-slide-refine-undo 已验证）
- `transformProject`（projects.ts:133）对 `globalConfig` 做 `JSON.parse`，新增的 `previousRequirements` 子字段会自然带出——实现时用测试验证刷新后 `config.previousRequirements` 仍有值
- OutlineGenerator 的 `topic`/`fileParsedContent` 是组件内 state，关闭模态框销毁（符合设计）
- App.tsx AI修饰按钮区 `absolute bottom-3 right-3`，撤回按钮放 `right-[4.5rem]` 不重叠
- 用空串 `""` 清空 `previousRequirements`（不用 null/undefined），保证 globalConfig JSON 干净 + 按钮显示条件 `config.previousRequirements` 为 falsy

## Implementation Slices（按执行依赖排序，三者互相独立）

### Slice 1: ResultCard 边界 a 修正
- **来源**：tasks 1.1–1.2；slide-refine MODIFIED "手动编辑不隐藏"
- **目标**：手动编辑 textarea 不再清空 previousContent，撤回按钮保留
- **依赖**：无
- **改动文件**：
  - Modify: `src/components/ResultCard.tsx:309`（textarea onChange 去掉 `previousContent: undefined`）
  - Modify: `src/components/ResultCard.test.tsx`（边界 a 用例改向）
- **TDD 计划**：
  1. 改测试：原"手动编辑 onUpdate 带 previousContent: undefined" → 改为 `onUpdate({ textContent: '手动改了' })`（不带 previousContent）
  2. 运行测试确认失败（现状仍带 undefined）
  3. 改 ResultCard.tsx onChange 去掉 `previousContent: undefined`
  4. 运行测试确认通过
- **验证命令**：
  - `npx vitest run src/components/ResultCard.test.tsx` — 用例全过（含改向的边界 a）
- **完成标准**：
  - 手动编辑后 onUpdate 不含 previousContent 字段
  - previousContent 保留，撤回按钮仍显示
- **风险/回滚**：去掉一个参数；回滚即加回 `previousContent: undefined`

### Slice 2: 设计要求撤回（App.tsx，持久化方案）
- **来源**：tasks 2.1–2.5；design-requirements-refine ADDED
- **目标**：handleRefineRequirements 修饰前把旧值存入 config.previousRequirements，撤回按钮恢复 + 入库；刷新后撤回仍在
- **依赖**：无（独立于 Slice 1）
- **改动文件**：
  - Modify: `src/types.ts`（StyleConfig 加 previousRequirements?: string）
  - Modify: `src/App.tsx`（import Undo2 + handleRefineRequirements 存旧值 + handleUndoRequirementsRefine + 撤回按钮 JSX）
  - Create: `src/__tests__/components/RequirementsRefineUndo.test.tsx`
- **TDD 计划**：
  1. 写测试：mock smartRefineAuto，触发 handleRefineRequirements，断言 `handleConfigChange` 被以 `("previousRequirements", oldRequirements)` 调用
  2. 写测试：撤回 onClick 调用 `handleConfigChange("requirements", previousRequirements)` + `handleConfigChange("previousRequirements", "")`
  3. 写测试：手动编辑不清空 previousRequirements
  4. 写测试（刷新持久）：mock transformProject 返回带 previousRequirements 的 globalConfig JSON，断言 config.previousRequirements 有值、撤回按钮显示
  5. 实现 StyleConfig 字段 + handleRefineRequirements 存旧值 + handleUndoRequirementsRefine + 撤回按钮
- **验证命令**：
  - `npx vitest run src/__tests__/components/RequirementsRefineUndo.test.tsx` — 撤回用例通过（含刷新持久）
- **完成标准**：
  - 修饰后 `config.previousRequirements` 有值，撤回按钮显示（`config.previousRequirements && !isRefiningRequirements && !previewSnapshot`）
  - 点击撤回恢复 requirements + 清空 previousRequirements + auto-save 入库
  - 手动编辑不清空 previousRequirements
  - 刷新后 `config.previousRequirements` 从 globalConfig JSON 恢复，撤回按钮仍在
- **风险/回滚**：globalConfig 加子字段是兼容的（旧数据无 previousRequirements 字段，`config.previousRequirements` 为 undefined，按钮不显示，自然降级）；回滚即移除 StyleConfig 字段 + App.tsx 新增代码

### Slice 3: OutlineGenerator 主题/文件内容撤回（本地 ref 方案）
- **来源**：tasks 3.1–3.7；outline-input-refine ADDED
- **目标**：handleRefine 修饰前存对应 ref，两个 Tab 各加撤回按钮，清空同步清锚点
- **依赖**：无（独立）
- **改动文件**：
  - Modify: `src/components/OutlineGenerator.tsx`（import Undo2 + 两个 ref + handleRefine 存旧值 + 两个撤回按钮 + 清空同步）
  - Create: `src/components/OutlineGenerator.test.tsx`（若不存在）
- **TDD 计划**：
  1. 写测试：text Tab 触发 handleRefine → previousTopicRef 被设；file Tab → previousFileContentRef 被设
  2. 写测试：主题撤回 onClick 恢复 topic + 清 ref；文件内容撤回同理
  3. 写测试：清空按钮（Tab1/Tab2）清对应 ref
  4. 实现 ref + handleRefine 存旧值 + 两个撤回按钮 + 清空同步
- **验证命令**：
  - `npx vitest run src/components/OutlineGenerator.test.tsx` — 撤回用例通过
- **完成标准**：
  - 两个 Tab 修饰后各自显示撤回按钮
  - 撤回恢复对应 state + 清 ref + 按钮消失
  - 手动编辑不清空 ref
  - 清空按钮同步清对应 ref
- **风险/回滚**：OutlineGenerator 较大，改动需精确锚点（:342 handleRefine、:1100/1199 AI修饰按钮、:1088 清空、handleClearFileAndContent）；回滚即移除新增内容

## Verification Plan

- **单元**：`npx vitest run` 前端全量（含 ResultCard 边界 a 改向 + 设计要求撤回含刷新持久 + OutlineGenerator 撤回）
- **类型/构建**：`npm run build`（vite + tsc）
- **手动验证**（重启后端后）：
  1. ResultCard：修饰 → 手动编辑 → 撤回按钮仍在 → 撤回成功
  2. 设计要求：修饰 → 撤回按钮出现 → **刷新页面 → 撤回按钮仍在** → 点击恢复 + 入库
  3. OutlineGenerator Tab1：主题修饰 → 撤回 → 清空 → 撤回按钮消失
  4. OutlineGenerator Tab2：文件内容修饰 → 撤回 → 清空 → 撤回按钮消失

## Blockers / Clarifications

- **无**。三个 slice 互相独立，可并行实现；建议按 Slice 1 → 2 → 3 顺序（由简到繁）。
- 关键验证点：Slice 2 的"刷新持久"需测试 `transformProject` 的 `JSON.parse(globalConfig)` 是否带出 `previousRequirements`——若 `transformProject` 有字段白名单过滤需补映射（实现时第一步验证）。

## Superpowers Handoff

- `writing-plans` 必须基于本文件生成 `docs/superpowers/plans/YYYY-MM-DD-extend-refine-undo-coverage.md`
- 详细实现计划必须用 checkbox，每个 slice 展开为 2-5 分钟步骤
- 不得省略 Source Coverage 中的任何验收点
- 三个 slice 互相独立，可按任意顺序实现（建议 1→2→3）
- Slice 2 实现首步必须验证 `transformProject` 是否需要为 `previousRequirements` 加映射（参考 ResultCard 的 previousContent 映射修复教训）
