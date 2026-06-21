# 实现计划：add-slide-refine-undo

## 来源
- 提案：openspec/changes/add-slide-refine-undo/proposal.md
- 设计：openspec/changes/add-slide-refine-undo/design.md
- 规格：openspec/changes/add-slide-refine-undo/specs/slide-content/spec.md、specs/slide-refine/spec.md
- 任务：openspec/changes/add-slide-refine-undo/tasks.md

## Goal
用户在工作台对单页点 AI修饰后，可通过"撤回修饰"按钮单步恢复到修饰前内容；修饰前内容持久化到数据库（`Slide.previousContent`），刷新/切页/重开项目后仍可撤回；手动编辑后撤回窗口关闭（边界 a，保护手改）。

## Non-Goals
- 多步撤回历史栈（YAGNI，单步覆盖"修饰试错"）
- 撤回其他操作（生图、大纲生成、设计要求修饰）
- 项目级版本回退（沿用 `snapshot.service`）
- localStorage 持久化方案（已评估否决）

## Source Coverage

| OpenSpec 来源 | 验收点 | 对应 slice |
|---|---|---|
| slide-content / Requirement "Slide 存储修饰前内容" / Scenario "AI修饰存旧值" | 修饰后 `previousContent` = 修饰前 content，经 syncSlides 入库 | Slice 1, 2 |
| slide-content / Scenario "撤回恢复并清空" | 撤回将 `previousContent` 写回 content、置 null、入库 | Slice 1, 3 |
| slide-content / Scenario "再修饰覆盖（单步）" | 再修饰时 `previousContent` 更新为本次修饰前值 | Slice 2 |
| slide-content / Scenario "跨刷新/重开持久" | 刷新后 `previousContent` 从数据库恢复 | Slice 1 |
| slide-content / Scenario "旧数据兼容" | 无 `previousContent` 字段的旧 Slide 读取为 null，不报错 | Slice 1 |
| slide-refine / Requirement "撤回按钮" / Scenario "显示条件" | `previousContent && !isRefining && !readOnly` 时显示按钮 | Slice 3 |
| slide-refine / Scenario "点击撤回" | 点击恢复 textContent、清 previousContent、按钮消失、入库 | Slice 3 |
| slide-refine / Scenario "手动编辑后隐藏（边界a）" | 手动编辑清 `previousContent`、按钮消失 | Slice 4 |
| slide-refine / Scenario "只读不显示" | readOnly 模式不显示按钮 | Slice 3 |
| slide-refine / Scenario "修饰中不显示" | isRefining 时不显示按钮 | Slice 3 |
| slide-refine / Scenario "撤回无二次确认" | 撤回直接执行，无弹窗 | Slice 3 |

## File Responsibility Map

| 文件 | 操作 | 责任 | 相关 slice |
|---|---|---|---|
| `server/prisma/schema.prisma` | modify | `model Slide` 加 `previousContent String?` | Slice 1 |
| `src/types.ts` | modify | `GeneratedSlide` 加 `previousContent?: string` | Slice 1 |
| `server/src/services/project.service.ts` | modify | `syncSlides`（:268）upsert `data` 加 `previousContent` 字段映射 | Slice 1 |
| `server/src/validators/index.ts` | modify | `syncSlides` 输入 schema 允许 `previousContent` 可空字符串 | Slice 1 |
| `src/api/projects.ts` | modify | `syncSlidesMutation` 把前端 `previousContent` 映射到后端字段 | Slice 1 |
| `src/components/ResultCard.tsx` | modify | `handleSmartRefine` 存旧值 + 撤回按钮 + textarea 边界 a | Slice 2, 3, 4 |

## 已验证的关键假设（无 Blocker）

- **`handleUpdateItem`（[src/App.tsx:3001](src/App.tsx#L3001)）**：`{ ...item, ...updates }` partial merge ✅；`setHasUserInteraction(true)` 触发现有 auto-save ✅
- **`onUpdate` 链路**：`ResultCard.onUpdate={(updates)=>handleUpdateItem(id, updates)}`（[src/App.tsx:4752](src/App.tsx#L4752)）
- **`syncSlides`（[server/src/services/project.service.ts:268](server/src/services/project.service.ts#L268)）**：`prisma.$transaction` upsert，在循环内 upsert `data` 加 `previousContent` 即可（精确 data 行号在 Slice 1 build 时定位）

## Implementation Slices（按执行依赖排序）

### Slice 1: 数据模型 + 类型 + 持久化映射
- **来源**：tasks 1.1–1.6；slide-content Requirement（字段层）+ Scenario "旧数据兼容"、"跨刷新持久"
- **目标**：Slide 模型 / 前端类型 / syncSlides 持久化全链支持 `previousContent`
- **依赖**：无
- **改动文件**：
  - Modify: `server/prisma/schema.prisma` — `model Slide` 加 `previousContent String?`
  - Modify: `src/types.ts` — `GeneratedSlide` 加 `previousContent?: string`
  - Modify: `server/src/services/project.service.ts` — `syncSlides` upsert `data` 加 `previousContent` 字段（从入参 `slide.previousContent` 映射）
  - Modify: `server/src/validators/index.ts` — syncSlides 输入 schema 允许 `previousContent: z.string().nullable().optional()`
  - Modify: `src/api/projects.ts` — `syncSlidesMutation` 映射 `previousContent`
- **TDD 计划**：
  1. 改 schema → `cd server && npx prisma db push` 同步 + generate
  2. 后端测试：`syncSlides` 写入带 `previousContent` 的 slide，查库读回字段保留；旧 slide（null）不报错
  3. 类型同步：GeneratedSlide + validator + mutation 映射
- **验证命令**：
  - `cd server && npx prisma db push` — 同步 schema + 自动 generate Prisma Client
  - `cd server && bun test` — syncSlides 字段写入/读取/旧数据兼容
  - node 脚本确认 `Slide` 表实际新增 `previousContent` 列
- **完成标准**：
  - `Slide` 表有可空 `previousContent` 列
  - `syncSlides` 能写入并读回 `previousContent`
  - 旧 Slide（无字段）读取为 null，不影响 content 渲染
- **风险/回滚**：字段可空，反向迁移安全；`db push` 后端 dev 模式 ts-node 需重启

### Slice 2: 修饰存旧值
- **来源**：tasks 2.1–2.2；slide-content Scenario "AI修饰存旧值"、"再修饰覆盖"
- **目标**：AI修饰开始时把当前 textContent 存入 `previousContent`
- **依赖**：Slice 1（字段就绪）
- **改动文件**：
  - Modify: `src/components/ResultCard.tsx` — `handleSmartRefine`（:142）在流式开始前调 `onUpdate({ previousContent: item.textContent })`
- **TDD 计划**：
  1. 先写失败测试：mock `onUpdate`，触发 `handleSmartRefine`，断言 `onUpdate` 被以 `{ previousContent: <修饰前 content> }` 调用
  2. 最小实现：修饰开始（`setIsRefining(true)` 前后）插入一次 `onUpdate({ previousContent: item.textContent })`，流式 chunk 与最终 `onUpdate({textContent})` 不变
  3. 边界：再修饰（已有 previousContent）时覆盖为新旧值
- **验证命令**：
  - `npx vitest run` — ResultCard `handleSmartRefine` 存旧值用例
- **完成标准**：
  - 修饰成功后 `item.previousContent` = 修饰前 textContent
  - 经 `handleUpdateItem` → auto-save → syncSlides 入库
  - 再修饰覆盖 previousContent（单步）
- **风险/回滚**：仅前端；移除存旧值那行即恢复

### Slice 3: 撤回按钮交互
- **来源**：tasks 3.1–3.3；slide-refine Requirement 全部 Scenario（显示条件 / 点击撤回 / 只读 / 修饰中 / 无二次确认）
- **目标**：ResultCard 显示撤回按钮，点击单步恢复 + 清空
- **依赖**：Slice 1（previousContent 字段）+ Slice 2（修饰产生 previousContent）
- **改动文件**：
  - Modify: `src/components/ResultCard.tsx` — 新增撤回按钮（`Undo` 图标 + "撤回修饰"，次级低强调样式）+ 显示条件 + onClick
- **TDD 计划**：
  1. 测试：`previousContent` 有值 + `!isRefining` + `!readOnly` → 按钮渲染
  2. 测试：`readOnly` 或 `isRefining` → 按钮不渲染
  3. 测试：点击撤回 → `onUpdate({ textContent: previousContent, previousContent: undefined })`
  4. 测试：撤回无确认弹窗（直接执行）
  5. 实现：按钮 UI + 显示条件 + onClick handler
- **验证命令**：
  - `npx vitest run` — ResultCard 撤回按钮全用例
- **完成标准**：
  - 撤回按钮按条件显示/隐藏
  - 点击撤回恢复 textContent、清 previousContent、按钮消失、入库
- **风险/回滚**：纯 UI；移除按钮即恢复

### Slice 4: 边界 a（手动编辑清空）
- **来源**：tasks 4.1；slide-refine Scenario "手动编辑后隐藏（边界a）"
- **目标**：textarea 手动编辑时清空 `previousContent`，撤回按钮消失
- **依赖**：Slice 3
- **改动文件**：
  - Modify: `src/components/ResultCard.tsx` — textarea `onChange` 的 `onUpdate` 加 `previousContent: undefined`
- **TDD 计划**：
  1. 测试：修饰后手动编辑 textarea → `onUpdate` 带 `previousContent: undefined` → 按钮消失
  2. 实现：`onChange` → `onUpdate({ textContent: e.target.value, previousContent: undefined })`
  3. 回归：正常编辑 textContent 不受影响
- **验证命令**：
  - `npx vitest run` — 边界 a 用例 + 编辑回归
- **完成标准**：
  - 手动编辑后 previousContent 清空、撤回按钮消失
  - 正常 textContent 编辑不受影响
- **风险/回滚**：移除 onChange 里的 `previousContent: undefined` 即退到边界 b

## Verification Plan

- **单元/集成**：
  - `cd server && bun test` — syncSlides previousContent 写入/读取/旧数据兼容
  - `npx vitest run` — ResultCard 全用例（存旧值 / 撤回 / 边界 a / 显示条件 / 只读 / 修饰中）
- **类型/构建**：
  - `cd server && npm run build` — 后端 tsc 严格模式
  - `npm run build` — 前端 vite 构建
- **手动验证**：
  1. 工作台某页 AI修饰 → 点撤回 → content 恢复、按钮消失
  2. 修饰后刷新页面 → 撤回按钮仍在、可用
  3. 修饰后手动编辑 textarea → 撤回按钮消失（边界 a）
  4. readOnly 快照预览 → 撤回按钮不显示
  5. 数据库查 `Slide.previousContent` 列正确存取

## Blockers / Clarifications

- **无**。关键假设已在 spec 阶段验证：
  - `handleUpdateItem` 是 partial merge 且触发 auto-save（[src/App.tsx:3001](src/App.tsx#L3001)）
  - `syncSlides` 在 [server/src/services/project.service.ts:268](server/src/services/project.service.ts#L268)，upsert data 加 previousContent 即可（精确 data 行号 Slice 1 build 时定位）

## Superpowers Handoff

- `writing-plans` 必须基于本文件生成 `docs/superpowers/plans/YYYY-MM-DD-add-slide-refine-undo.md`
- 详细实现计划必须使用 checkbox，把每个 slice 展开为 2-5 分钟步骤
- 详细实现计划不得省略 Source Coverage 中的任何验收点
- 实现顺序严格按 Slice 1 → 2 → 3 → 4（数据层 → 存旧值 → 撤回 → 边界），后者依赖前者
