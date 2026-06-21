# slide-content Specification

## Purpose
TBD - created by archiving change add-slide-refine-undo. Update Purpose after archive.
## Requirements
### Requirement: Slide 模型存储修饰前内容

`Slide` 模型 SHALL 新增可空字段 `previousContent`，用于存储最近一次 AI修饰前的 `content` 值，作为单步撤回的锚点。字段生命周期与 `Slide` 一致，随项目持久化。

#### Scenario: AI修饰触发保存旧值

- WHEN 用户对某页 textContent 触发 AI修饰（`slide_refine`）并成功完成
- THEN 系统在写入新 `content` 前，将该页当前 `content` 值保存到 `previousContent`
- AND 通过 `syncSlidesMutation` 将 `content`（新值）与 `previousContent`（旧值）一同持久化到数据库

#### Scenario: 撤回恢复并清空

- WHEN 用户对带有 `previousContent` 的页触发撤回
- THEN 系统将 `previousContent` 的值写回 `content`
- AND 将 `previousContent` 置为 `null`
- AND 通过 `syncSlidesMutation` 持久化

#### Scenario: 再修饰覆盖旧值（单步语义）

- WHEN 用户对已存在 `previousContent` 的页再次触发 AI修饰
- THEN `previousContent` 被更新为本次修饰前的 `content`（覆盖上一次旧值）
- AND 不累积历史（始终只保留最近一次修饰前的值）

#### Scenario: 跨刷新/重开持久

- WHEN 用户修饰后刷新页面或重新打开项目
- THEN 该页 `previousContent` 从数据库恢复
- AND 撤回功能保持可用

#### Scenario: 旧数据兼容

- GIVEN 数据库中已存在的、无 `previousContent` 字段的 Slide（变更前数据）
- THEN 该字段读取为 `null`
- AND 不影响现有 content 渲染与功能

