---
title: 修复 PR Review 发现的 Critical + Important 问题
status: proposed
created: 2026-06-11
---

# 修复 PR Review 发现的 Critical + Important 问题

## 动机

PR Review（4 个维度：通用代码质量、静默失败审计、测试覆盖分析、代码简化）发现了当前未提交变更中的 5 项 Critical、7 项 Important 问题和多处代码简化机会。这些缺陷涉及 React 并发安全、错误处理健壮性、测试覆盖完整性、代码维护性等维度。

## 需求描述

一次性修复所有 Critical + Important 问题，补充测试缺口，并执行高优代码简化。

## 范围

### 包含

1. **CRITICAL 修复**
   - `handleRegenerate` 中 `syncSlidesMutation.mutate()` 移出 `setItems` 回调（与 batch/single handler 一致）+ 加重试和用户提示
   - `syncWithRetry()` 失败后向用户展示 toast 提示（batch + single + regen 三处）
   - `callOpenAICompatibleStream` JSON 解析空 catch 加日志
   - `getOutputMode` 空 catch 加日志
   - `handleRegenerate` 中 `updateProjectMutation.mutate()` 移出 `setItems` 回调

2. **IMPORTANT 修复**
   - `syncSlidesMutation.mutate()` 7+ 处调用加 `.catch()` 日志
   - `generateStylePreview` 传入 `context` 参数
   - `complementScenarioInputs` 错误日志改进（区分"无输入"和"API 失败"）
   - Vision 分析 catch 消息纠正
   - `scenario3` 测试 mock 隔离（不触发真实 LLM API）
   - `splitContent` 追加 `小结`/`总结`/`key_takeaways` 关键词测试
   - `buildImageGenerationPrompt` 追加 `directory` + `allSlideTitles` 测试

3. **测试缺口补充（5 个）**
   - splitContent: `小结`/`总结`/`key_takeaways` 关键词
   - splitContent: 结论区内空行截断场景
   - complementScenarioInputs: scenario3 `injectedKeywords` mock 验证
   - buildImageGenerationPrompt: `directory` + `allSlideTitles`
   - extractDesignSuggestion: `---` 分隔符截断

4. **代码简化（高优先级）**
   - `smartRefine` + `smartRefineStream` prompt 模板提取为模块级常量（~200 行去重）
   - App.tsx: `syncSlidesWithRetry` + `checkProjectCompletion` 提取为 useCallback hooks（~50 行去重）
   - ai.controller.ts: 流式/非流式 wrapper 提取（~150 行去重）
   - ai.service.ts: `callTextModel` 辅助函数提取（~80 行去重）
   - ai.service.ts: `buildImageGenerationPrompt` content type switch → 数据驱动配置
   - ai.service.ts: ModelScope 轮询独立为 `pollModelScopeTask` 函数

### 不包含

- 不新增功能
- 不改业务逻辑
- 不改 UI 行为（仅补错误提示 toast）
- 不修改已有的业务逻辑测试（仅追加新测试 case）

## 验收条件

1. 🟢 后端全部 79 个测试通过（原有 + 新增 case 全部通过）
2. 🟢 前端 TypeScript 编译零错误
3. 🟢 不再有 `setItems` 回调内调用 `mutate()` 的反模式
4. 🟢 `syncWithRetry` 失败时用户能看到 toast 提示
5. 🟢 单元测试不再触发真实 LLM API 调用
6. 🟢 没有空 catch 块（全部有日志）
7. 🟢 `generateStylePreview` 传入了 `context`，降级信号不丢失
8. 🟢 prompt 模板去重后不变更行为（测试通过验证）
