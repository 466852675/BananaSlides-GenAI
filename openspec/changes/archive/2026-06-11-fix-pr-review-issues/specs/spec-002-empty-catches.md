---
title: SPEC-002 — 空 catch 块清理 + 错误路径日志增强
status: draft
---

# SPEC-002: 空 catch 块清理 + 错误路径日志增强

## 变更类型

Bugfix（错误处理健壮性）

## 改动文件

- `server/src/services/ai.service.ts` — 3 处
- `src/services/geminiService.ts` — 2 处
- `src/App.tsx` — 1 处

## 具体变更

### 2.1 `callOpenAICompatibleStream` JSON 解析 catch（ai.service.ts:~2469）

**当前**：
```typescript
} catch {
    // Ignore parse errors for incomplete chunks
}
```

**目标**：
- 首次解析失败静默（预期行为——不完整流块）
- 同一流中连续 3 次失败 → 输出警告日志
- 或至少打一次 warn 日志

### 2.2 `getOutputMode` catch（geminiService.ts:~271）

**当前**：空 catch，静默返回 `'stream'`

**目标**：加 `console.warn` 日志说明默认值原因

### 2.3 `extractDesignSuggestion` catch（ai.service.ts:~338）

**当前**：`catch (e) { return ""; }`

**目标**：先 `console.warn('[extractDesignSuggestion] Failed:', e)` 再返回

### 2.4 `extractPageSpecificRequirements` catch（ai.service.ts:~322）

**当前**：`catch (e) { return { content: fullRequirements, isFallback: true }; }`

**目标**：先 `console.error("[SmartPrompt] Unexpected error:", e)` 再返回

### 2.5 通知轮询 catch（App.tsx:~910）

**当前**：`catch (e) { // Ignore }`

**目标**：`console.warn('[Notification Poll] Unexpected sync error:', e)`

### 2.6 `analyzeStyleImage` 错误消息纠正（ai.service.ts:~112）

**当前**：catch 消息 `[analyzeStyleImage] Style analysis failed`，实为资源加载失败

**目标**：消息改为 `[analyzeStyleImage] Style analysis or resource loading failed`，合并内外层 try-catch

### 2.7 `complementScenarioInputs` 错误日志改进（ai.service.ts:~243）

**当前**：`console.warn('[complementScenarioInputs] Error, returning empty:', e)`

**目标**：单独记录 `extractKeywordsViaTextLLM` 失败，"区分无输入 vs API 失败"——但现有 catch 逻辑已足够，只需确保日志包含了失败来源标识

## 验证方式

- 运行 `cd server && bun test` 确认全部通过
- `grep -r "catch.*// Ignore\|catch.*// ignore" server/src/` 确认无空 catch（本 spec 涉及的部分）
