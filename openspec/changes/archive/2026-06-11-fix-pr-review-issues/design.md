---
title: 设计文档 — PR Review 问题修复
status: draft
created: 2026-06-11
---

# 设计文档

## 问题分类与处理策略

### 1. React setItems 回调内副作用（Critical）

**现状**：`handleRegenerate` 在 `setItems` 回调内调用了 `syncSlidesMutation.mutate()` 和 `updateProjectMutation.mutate()`，违反了 React 状态更新器应为纯函数的原则。React 严格模式会双重调用此回调，导致 side effect 执行两次。

**方案**：与 `handleGenerateBatch` 和 `handleSingleGenerate` 已修复的模式一致——先计算 `slidesToSync`，再 `setItems(() => slidesToSync)` 更新 UI，然后**在回调外**执行 `syncSlidesMutation.mutateAsync()` 并加 1 次重试（1s 间隔），成功后 invalidate 查询缓存。

### 2. Fire-and-forget 无错误通知（Critical + Important）

**现状**：`syncWithRetry()` 是 `async` 函数但被调用时无 `await`，两处 handler 都即发即弃。另外 7+ 处 `syncSlidesMutation.mutate()` 无 `.catch()`。

**方案**：
- `handleGenerateBatch` 和 `handleSingleGenerate`：`await syncWithRetry()` + catch 中 `showToast`
- `handleRegenerate`：与上一致
- 其他 7+ 处：至少加 `.catch()` 日志

### 3. 空 catch 块清理（Critical + Important）

**现状**：`callOpenAICompatibleStream` JSON 解析 catch、`getOutputMode` catch、`extractDesignSuggestion` catch、`extractPageSpecificRequirements` catch、通知轮询 catch 为空或只 `console.error` 不足。

**方案**：所有空 catch 块统一加 `console.warn` 日志，明确错误来源和上下文。

### 4. Vision 分析错误路径信号丢失（Important）

**现状**：
- `generateStylePreview` 调用 `generateSlideVariant` 时未传 `context` 参数，Smart Filter 降级信号静默丢失
- `analyzeStyleImage` catch 返回 `{ keywords: "", hexColors: [] }`，外层 catch 消息说"Vision analysis failed"但实际可能是资源加载失败

**方案**：
- `generateStylePreview` 创建并传入 `warningContext` 对象
- `analyzeStyleImage` 合并内外层 catch，统一错误消息

### 5. 测试隔离问题（Important）

**现状**：`complementScenarioInputs` 的 scenario3 测试在 `settings: undefined` 下调用，触发真实数据库和 LLM API 调用。

**方案**：传入 mock settings 对象或 mock `resolveActiveConfig`/`callOpenAICompatible`，确保单元测试不依赖外部服务。

### 6. 代码简化策略

#### 6.1 Prompt 模板去重
`smartRefine` 和 `smartRefineStream` 各有 4 个 prompt 模板（requirement_polish、template_description、requirement、content），字节级重复。

**方案**：提取为模块级 `PROMPT_TEMPLATES: Record<string, (input: string) => string>` 常量。两方法引用同一组模板。

#### 6.2 App.tsx sync helper 提取
`handleGenerateBatch`、`handleSingleGenerate`、`handleRegenerate` 三个 handler 各自实现相同的 sync + completion check 模式。

**方案**：提取两个 `useCallback` hook：
- `useSyncSlidesWithRetry()` — 封装带重试的数据库同步
- `useCheckProjectCompletion()` — 封装检查全部完成并标记状态

#### 6.3 Controller wrapper 提取
3 个流式 + 8 个非流式 Controller 共享 SSE 头设置、积分扣减/完成/退款模式。

**方案**：
- `streamWithPoints(actionCode, req, res, handler)` — 流式 wrapper
- `handleWithPoints(actionCode, req, res, handler)` — 非流式 wrapper

#### 6.4 callTextModel 提取
8 处 `shouldUseGeminiNative` 分支在 text task 方法中结构一致（Gemini SDK vs callOpenAICompatible）。

**方案**：创建 `callTextModel(config, settings, prompt)` 辅助函数，对 text-only 任务封装分支逻辑。

#### 6.5 Content type 数据驱动
`buildImageGenerationPrompt` 中 `detectContentType` 后的 switch 分支有 4 种类型的 `maxContentLen`、`injectAs`、`pageTypeOverrides` 配置。

**方案**：改为 `CONTENT_TYPE_CONFIG` 配置表。

#### 6.6 ModelScope 轮询抽取
`callOpenAIImageGeneration` 中 ModelScope 异步轮询块（~60 行）独立为 `pollModelScopeTask()` 函数。

## 文件影响矩阵

| 文件 | 改动类型 | 估算变更量 |
|------|---------|-----------|
| `server/src/services/ai.service.ts` | Critical 修复 + 代码简化 + 补充测试 | ~300 行净增，~200 行去重 |
| `src/App.tsx` | Critical 修复 + 代码简化 | ~50 行净增，~50 行去重 |
| `server/src/controllers/ai.controller.ts` | 代码简化 | ~80 行净增，~150 行去重 |
| `src/services/geminiService.ts` | Important 修复 | ~20 行 |
| `server/src/routes/ai.routes.ts` | 无变更 | — |
| `server/src/__tests__/services/ai-prompt.test.ts` | 补充测试 | ~80 行新增 |
