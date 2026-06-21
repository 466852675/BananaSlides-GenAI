# design-requirements-refine Specification

## Purpose
TBD - created by archiving change extend-refine-undo-coverage. Update Purpose after archive.
## Requirements
### Requirement: 设计要求 AI修饰提供单步撤回（持久化）

App.tsx 工作台全局设置面板的设计要求 AI修饰（`handleRefineRequirements`，type=`requirement`）SHALL 提供单步撤回，让用户在 AI修饰不满意时退回修饰前的设计要求。**撤回锚点 `previousRequirements` 随 `globalConfig` 入库，刷新/退出重进后撤回按钮仍显示**（与 ResultCard 的 `Slide.previousContent` 持久化模式对称）。

#### Scenario: 修饰触发存旧值

- WHEN 用户对设计要求触发 AI修饰（`handleRefineRequirements`）并成功完成
- THEN 系统在写入新 requirements 前，通过 `handleConfigChange("previousRequirements", config.requirements)` 把当前 requirements 存入 `config.previousRequirements`
- AND 经 auto-save → `updateProjectMutation` 写回 `globalConfig` 入库
- AND 撤回按钮显示（`config.previousRequirements` 非空）

#### Scenario: 点击撤回

- WHEN 用户点击撤回按钮
- THEN `config.requirements` 恢复为 `config.previousRequirements` 的值
- AND `config.previousRequirements` 被清空（置为空串）
- AND 撤回按钮消失
- AND 通过 `handleConfigChange` → auto-save → `updateProjectMutation` 把恢复后的 requirements 与清空的 previousRequirements 一起写回 `globalConfig` 入库

#### Scenario: 手动编辑不清空锚点

- WHEN 用户在 AI修饰成功后，手动编辑设计要求 textarea
- THEN `config.previousRequirements` 保留不清空
- AND 撤回按钮仍显示

#### Scenario: 再修饰覆盖（单步）

- WHEN 用户对已存在 `config.previousRequirements` 的设计要求再次触发 AI修饰
- THEN `config.previousRequirements` 更新为本次修饰前的 requirements（覆盖上一次旧值，单步语义）

#### Scenario: 只读模式不显示

- GIVEN 项目处于快照预览（`previewSnapshot` 非空）
- THEN 不显示撤回按钮

#### Scenario: 修饰中不显示

- WHEN `isRefiningRequirements === true`
- THEN 不显示撤回按钮

#### Scenario: 刷新/退出重进后撤回仍可用（持久化）

- GIVEN 用户 AI修饰设计要求后刷新页面或退出项目再进入
- WHEN 项目重新加载，`transformProject` 从 `globalConfig` JSON 解析出 `previousRequirements` 字段
- THEN `config.previousRequirements` 仍有值（随 globalConfig 持久化）
- AND 撤回按钮仍显示
- AND 用户点击撤回可正常恢复到修饰前的 requirements

