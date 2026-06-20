---
title: SPEC-005 — 测试隔离 + 缺口补充
status: draft
---

# SPEC-005: 测试隔离 + 缺口补充

## 变更类型

测试

## 改动文件

`server/src/__tests__/services/ai-prompt.test.ts`

## 具体变更

### 5.1 scenario3 测试隔离（complementScenarioInputs）

**当前**：传入 `undefined` settings，触发真实数据库和 LLM API 调用

**目标**：传入 mock settings 对象，阻止真实 API 调用
```typescript
const mockSettings = {
    ai: { textModel: '', baseUrl: 'http://localhost:0', apiKey: '' }
} as any;
```

### 5.2 splitContent 结论关键词补充

追加 3 个 test case：
- `小结` 关键词
- `总结` 关键词
- `key_takeaways` 关键词

### 5.3 splitContent 结论区内空行截断

追加 test case：表格后 `结论：\n要点1\n\n新段落内容`，验证空行后内容归入 bodyBlock。

### 5.4 buildImageGenerationPrompt directory 页面

追加 test case：`pageType: 'directory'` + `allSlideTitles: ['章节1', '章节2', '章节3']`，验证 prompt 包含 `大纲参考:` 行。

### 5.5 extractDesignSuggestion --- 分隔符

追加 test case：`**设计建议：** 采用中心发散布局\n---\n忽略的内容`，验证结果为 `采用中心发散布局`。

### 5.6 complementScenarioInputs scenario3 injectedKeywords

追加 test case：mock `extractKeywordsViaTextLLM` 返回值或通过 mock settings 验证 `injectedKeywords` 不为空。

## 验证方式

- `cd server && bun test` 全部通过
- 新 case 覆盖的场景不再有红色未覆盖行（istanbul ignore）
