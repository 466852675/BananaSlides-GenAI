---
title: SPEC-001 — handleRegenerate 修复（setItems 回调内副作用）
status: draft
---

# SPEC-001: handleRegenerate 修复

## 变更类型

Bugfix（React 并发安全）

## 改动文件

`src/App.tsx`

## 当前行为

```typescript
setItems((currentItems) => {
  const slidesToSync = currentItems.map(slide => {
    if (slide.id === result.itemId) {
      return { ...slide, variants: result.variants, status: 'success' as const };
    }
    return slide;
  });

  syncSlidesMutation.mutate({          // ← 反模式：setItems 回调内的副作用
    projectId: currentProjectId,
    slides: slidesToSync
  });

  return slidesToSync;
});

setItems((currentItems) => {
  const allCompleted = currentItems.length > 0 &&
    currentItems.every(i => i.status === 'success');
  if (allCompleted && currentProjectId) {
    updateProjectMutation.mutate({     // ← 反模式：setItems 回调内的副作用
      id: currentProjectId,
      data: { status: 'completed' }
    });
  }
  return currentItems;
});
```

## 目标行为

与 `handleGenerateBatch`/`handleSingleGenerate` 已修复模式一致：

1. 从 `items`（渲染闭包快照）计算 `slidesToSync`
2. `setItems(() => slidesToSync)` — 纯状态更新
3. **在 setItems 回调外** `await syncSlidesMutation.mutateAsync(...)` + 1 次重试（1s 间隔）
4. 成功后 `queryClient.invalidateQueries`
5. 失败后 `showToast` 通知用户
6. `checkProjectCompletion` 也移至 setItems 外部

## 验证方式

- 运行 `npm test` 确认前端测试通过
- 肉眼确认 `setItems` 回调内不再有 `.mutate()` / `.mutateAsync()` 调用
