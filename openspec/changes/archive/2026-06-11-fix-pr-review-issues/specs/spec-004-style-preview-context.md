---
title: SPEC-004 — generateStylePreview context 传递修复
status: draft
---

# SPEC-004: generateStylePreview context 传递

## 变更类型

Bugfix（信号丢失）

## 改动文件

`server/src/services/ai.service.ts`

## 当前行为

`generateStylePreview` 调用 `generateSlideVariant` 时未传第 13 个参数 `context`，Smart Filter 降级信号静默丢失。

## 目标行为

```typescript
async generateStylePreview(...): Promise<string> {
    const warningContext: { warning?: string } = {};
    const result = await AIService.generateSlideVariant(
        ..., /* 现有 12 个参数 */
        warningContext    // 第 13 个参数
    );
    if (warningContext.warning) {
        console.warn('[generateStylePreview] Smart filter fell back:', warningContext.warning);
    }
    return result;
}
```

## 验证方式

- 后端 TypeScript 编译通过
- `generateStylePreview` 中 `warningContext.warning` 写入日志可观测
