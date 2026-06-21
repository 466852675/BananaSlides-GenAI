# 变更提案：撤回功能覆盖扩展 + 边界 a 统一修正

## 背景与动机

`add-slide-refine-undo` 已归档（单页 ResultCard 内容撤回，主规格在 `openspec/specs/slide-refine/`、`slide-content/`）。后续审计发现两个问题：

1. **边界 a 设计偏差**：ResultCard 现行规则"手动编辑 textarea 清空 previousContent"过激——用户 AI修饰后微调几个字仍应能撤回整个修饰，不该因动了字就失去撤回权。应统一为"手动编辑不清空撤回锚点"。
2. **覆盖不足**：审计发现还有 2 个高频 AI修饰入口缺少撤回——
   - **设计要求修饰**（App.tsx `handleRefineRequirements`）：设计要求是 PPT 视觉风格基础，修饰不满意需退回
   - **OutlineGenerator 主题/文件内容修饰**（`handleRefine`）：主题是整个 PPT 源头，修饰可能改方向/丢失原意

其他入口经评估不适合撤回：AgentGlobalConfigModal（与 App.tsx 共享 requirements 数据源，被覆盖）、AgentView 输入框（修饰后立即发送，窗口极短）、QuickTemplateModal（低频短文本）、StyleTemplateManager（P2，后续排期）。

## 目标

1. **修正 ResultCard 边界 a**：手动编辑不清空 previousContent，与新增入口边界统一
2. **新增设计要求撤回**：App.tsx `handleRefineRequirements` 入口
3. **新增 OutlineGenerator 撤回**：主题（`topic`）+ 文件内容（`fileParsedContent`）两个 Tab

## 范围

### 包含

- `src/components/ResultCard.tsx`：textarea `onChange` 去掉 `previousContent: undefined`
- `src/App.tsx`：`handleRefineRequirements` 加 `useRef` + `useState` 撤回态 + 撤回按钮
- `src/components/OutlineGenerator.tsx`：`handleRefine` 加两个 `useRef` + 两个撤回按钮 + "清空"按钮同步清锚点
- 测试更新（边界修正 + 两个新入口覆盖）

### 不包含

- AgentGlobalConfigModal（被 App.tsx 撤回覆盖，同一 `config.requirements` 数据源）
- StyleTemplateManager（P2，模板编辑低频，后续排期）
- AgentView 输入框（修饰即发送，撤回窗口极短）
- QuickTemplateModal（低频短文本）
- 后端 / schema 变更（无）

## 约束

| 约束 | 说明 |
|------|------|
| 仅前端 3 个文件 | 无后端、无 schema、无 prisma 变更 |
| 复用 Undo2 图标 | 与 ResultCard 一致 |
| 单步语义 | 再修饰覆盖锚点（与 ResultCard 一致） |
| **统一边界** | 手动编辑不清空锚点（修正 ResultCard + 新增入口均采用此规则） |
| 显式清空清锚点 | OutlineGenerator 的"清空"按钮同步清对应 ref |
| 持久性差异 | ResultCard 走 DB（已有）；设计要求/OutlineGenerator 走本地 state（不入库，刷新丢失——符合各自数据生命周期） |

## 技术方案

详见 [design.md](./design.md)。要点：

- **ResultCard 边界 a 修正**：textarea onChange 去掉 `previousContent: undefined`
- **设计要求撤回**：`previousRequirementsRef`（useRef）+ `showRequirementsUndo`（useState），修饰前存、撤回时 `handleConfigChange("requirements", old)` 触发 auto-save 入库
- **OutlineGenerator 撤回**：`previousTopicRef` + `previousFileContentRef`（useRef），按 activeTab 存/撤

## 验收标准

- ✅ ResultCard 手动编辑 textarea 后，撤回按钮**仍显示**（previousContent 保留）
- ✅ 设计要求 AI修饰后显示撤回按钮；点击恢复 requirements + 清空 ref + 按钮消失 + 入库
- ✅ OutlineGenerator 主题修饰后显示主题撤回按钮；点击恢复 topic + 清空 ref
- ✅ OutlineGenerator 文件内容修饰后显示文件内容撤回按钮；点击恢复 fileParsedContent + 清空 ref
- ✅ 三个入口手动编辑均不清空撤回锚点（统一规则）
- ✅ OutlineGenerator "清空"按钮显式清空对应 ref，撤回按钮消失
- ✅ 再修饰覆盖锚点（单步）
- ✅ readOnly / 修饰中不显示撤回按钮（三个入口一致）

## 风险与对策

| 风险 | 对策 |
|------|------|
| 边界 a 修正可能让用户困惑（之前手动编辑后撤回消失是"保护"，现在保留） | 统一规则更符合直觉——"撤回 = 退回AI修饰前"，手动编辑不应剥夺此权 |
| App.tsx 5000 行，改动需精确锚点 | 已 grep 确认 `handleRefineRequirements`（:1955）+ AI修饰按钮（:4583）位置 |
| OutlineGenerator 模态框关闭后 ref 丢失 | 符合数据生命周期（topic/fileParsedContent 本就是模态框内本地 state） |

## 关联

- 前序变更：`add-slide-refine-undo`（已归档，主规格 `openspec/specs/slide-refine/spec.md`、`openspec/specs/slide-content/spec.md`）
- 修正对象：`openspec/specs/slide-refine/spec.md` 的"手动编辑后隐藏（边界 a）"场景
