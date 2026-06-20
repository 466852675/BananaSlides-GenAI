---
title: SPEC-006 — 代码简化
status: draft
---

# SPEC-006: 代码简化

## 变更类型

Refactor

## 改动文件

- `server/src/services/ai.service.ts`
- `src/App.tsx`
- `server/src/controllers/ai.controller.ts`

## 具体变更

### 6.1 Prompt 模板常量提取（ai.service.ts ~200 行去重）

**位置**：`smartRefine`（~1345）和 `smartRefineStream`（~2490）中的 4 组 prompt 模板

**方案**：模块级常量
```typescript
const PROMPT_TEMPLATES: Record<string, (input: string) => string> = {
    requirement_polish: (text) => `Role: ... Input: ${text}`,
    template_description: (text) => `Role: ... Input: ${text}`,
    requirement: (text) => `Role: ... Input: ${text}`,
    content: (text) => `Role: ... Input: ${text}`,
};
```

两方法引用相同模板，消除 ~200 行重复。

### 6.2 App.tsx sync helper 提取（~50 行去重）

**方案**：两个 `useCallback` hooks
- `useSyncSlidesWithRetry()` — 封装带 1 次重试的 `syncSlidesMutation.mutateAsync` + 成功后 `invalidateQueries`
- `useCheckProjectCompletion()` — 封装检查全部完成 + `updateProjectMutation.mutate`

三个 handler 原先 ~50 行 boilerplate 缩减为每处 ~10 行。

### 6.3 Controller wrapper 提取（~150 行去重）

**方案**：
- `streamWithPoints(actionCode, req, res, handler)` — 处理 SSE 头设置、并行积分扣减+配置获取、completeTransaction、退款、错误响应
- `handleWithPoints(actionCode, req, res, handler)` — 非流式版本

每个流式 Controller 从 ~80 行缩减为 ~10 行。

### 6.4 callTextModel 提取（~80 行去重）

**方案**：对 text-only 任务提取
```typescript
async function callTextModel(
    config: ModelConnection,
    settings: AppSettings,
    prompt: string,
    systemPrompt?: string
): Promise<string>
```
封装 8 处 `shouldUseGeminiNative` 分支中的 Gemini SDK / callOpenAICompatible 选择。

### 6.5 Content type 数据驱动配置

**方案**：
```typescript
const CONTENT_TYPE_CONFIG = {
    table: { maxLen: 4000, injectAs: 'data_source', overrides: [...] },
    structured: { maxLen: 4000, injectAs: 'material', overrides: [...] },
    list: { maxLen: 4000, injectAs: 'material', overrides: [] },
    prose: { maxLen: 1500, injectAs: 'text', overrides: [] },
};
```
替换 `buildImageGenerationPrompt` 中 `switch(contentType)` 分支。

### 6.6 ModelScope 轮询提取

**方案**：`callOpenAIImageGeneration` 中 ModelScope 异步轮询块（60 行）独立为
```typescript
async function pollModelScopeTask(
    taskId: string,
    baseUrl: string,
    headers: Record<string, string>,
    timeout: number
): Promise<string>
```

## 验证方式

- 所有测试通过（行为不变性验证）
- 重构后的方法签名和返回值与原方法一致
