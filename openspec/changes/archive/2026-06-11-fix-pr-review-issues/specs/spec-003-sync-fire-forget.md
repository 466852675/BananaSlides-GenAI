---
title: SPEC-003 — syncSlidesMutation 即发即弃修复 + 用户通知
status: draft
---

# SPEC-003: syncSlidesMutation Fire-and-Forget 修复

## 变更类型

Bugfix（数据一致性）

## 改动文件

`src/App.tsx`

## 具体变更

### 3.1 `handleGenerateBatch` + `handleSingleGenerate`（~2661 / ~2757）

**当前**：
```typescript
syncWithRetry();  // async 但无 await
```

**目标**：
```typescript
await syncWithRetry();
```
并在 catch 中 `showToast('幻灯片数据保存失败，请检查网络后刷新页面', 'error')`

### 3.2 其他 7+ 处 `syncSlidesMutation.mutate()` 调用

**当前**：无 `.catch()`

**目标**：至少加 `.catch((e) => console.error('[CRITICAL] Slides sync failed, data may be lost!', e))`

位置（`App.tsx`）：
- ~1405 useEffect 防抖保存
- ~1433 flushAutoSave
- ~1742 handleOutlineImport
- ~1769 handleOutlineImport（第二处）
- ~2068 handleAddTextPage
- ~2152 confirmImageTasks

## 验证方式

- TypeScript 编译通过
- 所有 `.mutate()` 调用确认有 `.catch()` 或 `onError` 回调
