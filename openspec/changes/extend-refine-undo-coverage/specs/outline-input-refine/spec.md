# outline-input-refine capability delta（新增）

## ADDED Requirements

### Requirement: OutlineGenerator 主题/文件内容修饰提供单步撤回

OutlineGenerator 的主题输入（`topic`）和文件内容（`fileParsedContent`）AI修饰（`handleRefine`）SHALL 提供单步撤回，让用户在大纲生成向导中退回修饰前的内容。撤回仅在大纲生成器模态框打开期间有效（数据生命周期与模态框一致）。

#### Scenario: 主题修饰存旧值

- WHEN 用户在 text Tab 触发 AI修饰并成功完成
- THEN 系统把当前 `topic` 存入 `previousTopicRef`
- AND 主题撤回按钮显示

#### Scenario: 文件内容修饰存旧值

- WHEN 用户在 file Tab 触发 AI修饰并成功完成
- THEN 系统把当前 `fileParsedContent` 存入 `previousFileContentRef`
- AND 文件内容撤回按钮显示

#### Scenario: 点击主题撤回

- WHEN 用户点击主题撤回按钮
- THEN `topic` 恢复为 `previousTopicRef` 的值
- AND `previousTopicRef` 清空
- AND 主题撤回按钮消失

#### Scenario: 点击文件内容撤回

- WHEN 用户点击文件内容撤回按钮
- THEN `fileParsedContent` 恢复为 `previousFileContentRef` 的值
- AND `previousFileContentRef` 清空
- AND 文件内容撤回按钮消失

#### Scenario: 手动编辑不清空锚点

- WHEN 用户在 AI修饰成功后，手动编辑 textarea
- THEN 对应 ref（`previousTopicRef` 或 `previousFileContentRef`）保留不清空
- AND 对应撤回按钮仍显示

#### Scenario: 再修饰覆盖（单步）

- WHEN 用户对已存在旧值的 Tab 再次触发 AI修饰
- THEN 对应 ref 更新为本次修饰前的值（覆盖上一次旧值，单步语义）

#### Scenario: 清空按钮清空锚点

- WHEN 用户点击"清空"按钮（Tab1 清空 topic 或 Tab2 `handleClearFileAndContent`）
- THEN 对应 ref 清空
- AND 对应撤回按钮消失（清空是用户显式丢弃，撤回权同步放弃）

#### Scenario: 修饰中不显示

- WHEN `isRefining === true`
- THEN 不显示撤回按钮

#### Scenario: 模态框关闭后不可撤回

- GIVEN 用户 AI修饰后关闭 OutlineGenerator 模态框
- THEN 撤回锚点（本地 ref）随组件销毁丢失
- AND 重新打开模态框时撤回按钮不显示（topic/fileParsedContent 是模态框内本地 state，不跨会话持久）
