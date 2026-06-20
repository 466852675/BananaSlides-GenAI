---
title: 实现任务清单
status: draft
created: 2026-06-11
---

# Task 清单：PR Review 问题修复

## Task 1: 修复 handleRegenerate 反模式

**来源**：SPEC-001

**步骤**：
1. `App.tsx` — 将 `handleRegenerate` 中 `setItems` 回调内的 `syncSlidesMutation.mutate()` 和 `updateProjectMutation.mutate()` 移到回调外部（与 batch/single 已修复模式一致）
2. 带 1 次重试（1s 间隔），失败后 `showToast` 通知用户
3. 成功后 invalidate 项目查询缓存

**验证**：运行 `npm run test:run`，肉眼检查 `setItems` 回调内无 `.mutate()` 调用

---

## Task 2: 清理空 catch 块 + 增强错误日志

**来源**：SPEC-002

**步骤**：
1. `ai.service.ts` — `callOpenAICompatibleStream` JSON 解析 catch 加 `console.warn`
2. `geminiService.ts` — `getOutputMode` catch 加 `console.warn`
3. `ai.service.ts` — `extractDesignSuggestion` catch 加 `console.warn`
4. `ai.service.ts` — `extractPageSpecificRequirements` catch 加 `console.warn`
5. `App.tsx` — 通知轮询 catch 加 `console.warn`
6. `ai.service.ts` — `analyzeStyleImage` catch 消息纠正为 "Style analysis or resource loading failed"

**验证**：`grep -r "catch.*// Ignore\|catch.*// ignore" server/src/ src/` 确认无空 catch

---

## Task 3: 修复 syncSlidesMutation 即发即弃 + 通知

**来源**：SPEC-003

**步骤**：
1. `App.tsx` — `handleGenerateBatch` 中 `syncWithRetry()` 改为 `await syncWithRetry()` + catch 显示 Toast
2. `App.tsx` — `handleSingleGenerate` 同上
3. `App.tsx` — 7 处 `syncSlidesMutation.mutate()` 无 `.catch()` 的调用加 `.catch()` 日志

**验证**：TypeScript 编译通过，所有 `.mutate()` 调用有 `.catch()` 或 `onError`

---

## Task 4: 修复 generateStylePreview context 传递

**来源**：SPEC-004

**步骤**：
1. `ai.service.ts` — `generateStylePreview` 中创建 `warningContext` 对象
2. 传入 `generateSlideVariant` 的第 13 个参数
3. 降级时输出 `console.warn`

**验证**：后端 TypeScript 编译通过

---

## Task 5: 补充测试缺口 + 测试隔离

**来源**：SPEC-005

**步骤**：
1. `ai-prompt.test.ts` — scenario3 测试传入 mock settings 隔离真实 API 调用
2. `ai-prompt.test.ts` — splitContent 追加 `小结`/`总结`/`key_takeaways` 关键词 test case
3. `ai-prompt.test.ts` — splitContent 追加结论区内空行截断 test case
4. `ai-prompt.test.ts` — buildImageGenerationPrompt 追加 directory + allSlideTitles test case
5. `ai-prompt.test.ts` — extractDesignSuggestion 追加 `---` 分隔符 test case

**验证**：`cd server && bun test` 全部通过

---

## Task 6: 代码简化 — Prompt 模板常量提取

**来源**：SPEC-006/6.1

**步骤**：
1. `ai.service.ts` — 在模块顶部定义 `PROMPT_TEMPLATES: Record<string, (input: string) => string>` 常量，包含 4 个模板
2. `smartRefine` 中引用 `PROMPT_TEMPLATES[type]` 替代内联模板
3. `smartRefineStream` 同理

**验证**：`cd server && bun test` 全部通过（行为不变）

---

## Task 7: 代码简化 — App.tsx sync helper 提取

**来源**：SPEC-006/6.2

**步骤**：
1. `App.tsx` — 提取 `useSyncSlidesWithRetry()` useCallback hook
2. 提取 `useCheckProjectCompletion()` useCallback hook
3. 三个 handler（batch/single/regen）引用封装后的 hooks

**验证**：`npm run test:run` 通过

---

## Task 8: 代码简化 — Controller wrapper 提取

**来源**：SPEC-006/6.3

**步骤**：
1. `ai.controller.ts` — 实现 `streamWithPoints(actionCode, req, res, handler)` 函数
2. 实现 `handleWithPoints(actionCode, req, res, handler)` 函数
3. 3 个流式 Controller + 8 个非流式 Controller 引用 wrapper

**验证**：后端 TypeScript 编译通过

---

## Task 9: 代码简化 — callTextModel 提取

**来源**：SPEC-006/6.4

**步骤**：
1. `ai.service.ts` — 创建 `callTextModel(config, settings, prompt, systemPrompt?)` 辅助函数
2. 替换 text-only 任务中 8 处 `shouldUseGeminiNative` 分支

**验证**：`cd server && bun test` 全部通过

---

## Task 10: 代码简化 — Content type 数据驱动 + ModelScope 轮询提取

**来源**：SPEC-006/6.5 / 6.6

**步骤**：
1. `ai.service.ts` — 定义 `CONTENT_TYPE_CONFIG` 配置表，替换 `buildImageGenerationPrompt` 中的 switch 分支
2. `ai.service.ts` — 提取 `pollModelScopeTask()` 函数

**验证**：`cd server && bun test` 全部通过
