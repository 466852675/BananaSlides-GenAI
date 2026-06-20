# slide-refine capability delta

## ADDED Requirements

### Requirement: ResultCard 提供单步撤回按钮

`ResultCard` SHALL 在满足条件时显示"撤回修饰"按钮，点击后单步将该页恢复到最近一次 AI修饰前的内容。

#### Scenario: 显示条件

- GIVEN 某页 `previousContent` 非空
- WHEN 该页未处于修饰中（`isRefining === false`）且非只读模式（`readOnly === false`）
- THEN 在 textContent 区底部、AI修饰按钮旁显示"撤回修饰"按钮（`Undo` 图标，次级低强调样式）

#### Scenario: 点击撤回

- WHEN 用户点击"撤回修饰"按钮
- THEN 该页 `textContent` 恢复为 `previousContent` 的值
- AND `previousContent` 被清空为 `null`/`undefined`
- AND 撤回按钮随之消失
- AND 变更通过 `syncSlidesMutation` 入库（content 改回旧值、previousContent 清空）

#### Scenario: 手动编辑后隐藏（边界 a）

- WHEN 用户在 AI修饰成功后，手动编辑该页 textarea
- THEN `previousContent` 被清空
- AND 撤回按钮消失（保护用户手动编辑不被后续撤回覆盖）

#### Scenario: 只读模式不显示

- GIVEN 项目处于快照预览等只读模式（`readOnly === true`）
- THEN 不显示撤回按钮

#### Scenario: 修饰进行中不显示

- WHEN 该页正处于 AI修饰进行中（`isRefining === true`）
- THEN 不显示撤回按钮（避免与流式更新冲突）

#### Scenario: 撤回无二次确认

- WHEN 用户点击撤回按钮
- THEN 直接执行撤回，不弹出确认弹窗（低风险：previousContent 仅修饰时存，撤回必回到真实历史内容）
