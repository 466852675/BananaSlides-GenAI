# 实现计划：修复 PR Review 发现的 Critical + Important 问题

## 来源
- 提案：openspec/changes/fix-pr-review-issues/proposal.md
- 设计：openspec/changes/fix-pr-review-issues/design.md
- 规格：openspec/changes/fix-pr-review-issues/specs/
- 任务：openspec/changes/fix-pr-review-issues/tasks.md

## 实现步骤

### Task 1: 修复 handleRegenerate 反模式
- 目标：将 `setItems` 回调内的 `syncSlidesMutation.mutate()` 和 `updateProjectMutation.mutate()` 移到回调外部，加 1 次重试 + Toast 通知
- 改动文件：`src/App.tsx`
- 验证方式：肉眼确认无 `.mutate()` 在 `setItems` 回调内；`npm run test:run` 通过

### Task 2: 清理空 catch 块 + 增强错误日志
- 目标：6 处空 catch 统一加日志，避免信息丢失
- 改动文件：`server/src/services/ai.service.ts`、`src/services/geminiService.ts`、`src/App.tsx`
- 验证方式：`grep -r "catch.*// Ignore\|catch.*// ignore" server/src/ src/` 确认无空 catch；`cd server && bun test` 通过

### Task 3: 修复 syncSlidesMutation 即发即弃 + 通知
- 目标：`syncWithRetry()` 改为 await + catch Toast；7 处无 `.catch()` 的 `.mutate()` 调用加日志
- 改动文件：`src/App.tsx`
- 验证方式：TypeScript 编译通过

### Task 4: 修复 generateStylePreview context 传递
- 目标：`generateStylePreview` 创建 `warningContext` 传入 `generateSlideVariant` 第 13 参数
- 改动文件：`server/src/services/ai.service.ts`
- 验证方式：后端 TypeScript 编译通过

### Task 5: 补充测试缺口 + 测试隔离
- 目标：5 个新 test case + scenario3 mock settings 隔离
- 改动文件：`server/src/__tests__/services/ai-prompt.test.ts`
- 验证方式：`cd server && bun test` 全部通过

### Task 6: 代码简化 — Prompt 模板常量提取
- 目标：`smartRefine` + `smartRefineStream` 的 4 组 prompt 模板提取为模块级常量
- 改动文件：`server/src/services/ai.service.ts`
- 验证方式：`cd server && bun test` 全部通过（行为不变）

### Task 7: 代码简化 — App.tsx sync helper 提取
- 目标：提取 `useSyncSlidesWithRetry()` + `useCheckProjectCompletion()` useCallback hooks
- 改动文件：`src/App.tsx`
- 验证方式：`npm run test:run` 通过

### Task 8: 代码简化 — Controller wrapper 提取
- 目标：提取 `streamWithPoints()` + `handleWithPoints()` wrapper，消除 11 个 Controller 的模板代码
- 改动文件：`server/src/controllers/ai.controller.ts`
- 验证方式：后端 TypeScript 编译通过

### Task 9: 代码简化 — Content type 数据驱动
- 目标：`CONTENT_TYPE_CONFIG` 配置表替换 `buildImageGenerationPrompt` 中的 switch 分支
- 改动文件：`server/src/services/ai.service.ts`
- 验证方式：`cd server && bun test` 全部通过
