# 设计：单页 AI修饰撤回

## 1. 数据模型

### 1.1 schema 变更（[server/prisma/schema.prisma](server/prisma/schema.prisma) `model Slide`）

```prisma
model Slide {
  ...
  content          String    // 现有：当前内容（修饰后/撤回后/手改后）
  previousContent  String?   // 新增：最近一次 AI修饰前的内容（撤回锚点，可空）
  ...
}
```

- 开发环境：`cd server && npx prisma db push`
- 生产环境：`cd server && npx prisma migrate dev --name add_slide_previous_content`

### 1.2 前端类型（[src/types.ts](src/types.ts) `GeneratedSlide`）

```typescript
export interface GeneratedSlide {
  ...
  textContent?: string;
  previousContent?: string;   // 新增
  ...
}
```

### 1.3 后端同步

- `server/src/services/slide.service.ts`（或等价）：序列化/读取 `previousContent`
- `server/src/validators/index.ts`：`syncSlides` 输入 schema 允许 `previousContent` 为可空字符串
- `syncSlidesMutation`（前端 [src/api/projects.ts](src/api/projects.ts)）数据映射：`textContent → content`、`previousContent → previousContent`

## 2. 核心数据流

### 2.1 修饰（改造 [src/components/ResultCard.tsx:142](src/components/ResultCard.tsx#L142) `handleSmartRefine`）

```
修饰开始（isRefining=true 之前/之时）:
  const original = item.textContent
  onUpdate({ previousContent: original })        // 先存旧值

流式 chunk（现有，不变）:
  accumulatedText += chunk
  onUpdate({ textContent: accumulatedText })

最终（现有，不变）:
  onUpdate({ textContent: refined })

→ onUpdate 触发 debounced auto-save → syncSlidesMutation
→ 入库：content = refined, previousContent = original
```

### 2.2 撤回（新增，ResultCard 撤回按钮 onClick）

```
onUpdate({ textContent: item.previousContent, previousContent: undefined })

→ syncSlidesMutation
→ 入库：content = 旧值, previousContent = null
```

### 2.3 边界 a：手动编辑清空（[src/components/ResultCard.tsx](src/components/ResultCard.tsx) textarea `onChange`）

```
onChange(e):
  onUpdate({ textContent: e.target.value, previousContent: undefined })
  → 手动编辑即清空撤回锚点，撤回按钮消失
```

## 3. 状态机

| 状态 | `previousContent` | 撤回按钮 | 说明 |
|---|---|---|---|
| idle（未修饰/已撤回/已手改）| `null` | 隐藏 | 无可撤回内容 |
| refined（刚修饰完）| 有值 | 显示 | 可撤回到修饰前 |

状态迁移：
- idle → refined：AI修饰成功（写入 previousContent）
- refined → idle：撤回（清空 previousContent）/ 手动编辑（边界 a，清空）/ 再修饰（覆盖为新旧值，但仍属 refined 态）

## 4. UI 设计

### 4.1 撤回按钮

- **位置**：`ResultCard` 的 textContent 区底部，紧邻 AI修饰按钮（同一操作行）
- **显示条件**：`item.previousContent && !isRefining && !readOnly`
- **样式**：`Undo` 图标（lucide-react）+ "撤回修饰" 文案，**次级低强调**（outline/ghost 样式，不抢 AI修饰主按钮）
- **无二次确认弹窗**：撤回低风险（previousContent 仅修饰时存，撤回必回到真实历史内容）

### 4.2 交互细节

- 撤回按钮点击后立即生效（onUpdate 同步触发），按钮自身随 `previousContent` 清空而消失
- 修饰进行中（isRefining）按钮不显示，避免冲突
- readOnly（快照预览）按钮不显示

## 5. 关键假设（实现时验证）

以下假设来自 brainstorming 设计，需在 Slice 1 验证，不符则调整：

1. **`onUpdate` 是 partial merge**：传 `{previousContent}` 只更新 previousContent，不影响 textContent；反之亦然。若 onUpdate 是整体替换，需调整为传完整对象。
2. **`onUpdate` 触发 debounced syncSlides auto-save**：字段变更会入库。若 onUpdate 只改本地 state 不入库，需显式调 `syncSlidesMutation.mutateAsync`。
3. **`syncSlidesMutation` 支持任意 Slide 字段**：能写入 content + previousContent。若字段白名单受限，需扩展。

验证方式：Slice 1 先读 `App.tsx` 的 onUpdate 定义 + auto-save 链，确认上述假设。

## 6. 为什么不用 localStorage（已评估否决）

| 维度 | localStorage | 数据库字段（本方案）|
|---|---|---|
| 刷新可撤回 | ✅ | ✅ |
| 跨设备一致 | ❌（仅本机浏览器）| ✅ |
| 清缓存丢失 | ❌ 会丢 | ✅ 不丢 |
| schema 改动 | 无 | 加可空字段 |
| 与现有数据流一致 | ❌（旁路通道）| ✅（沿用 syncSlides）|

本产品是多设备同步的数据驱动平台，撤回态属内容数据应入库；localStorage 的"清缓存丢、跨设备割裂、第二条持久化通道"与产品定位不符。

## 7. 测试策略

### 7.1 后端（bun test）

- `syncSlides` 写入带 `previousContent` 的 Slide，读回字段保留
- `previousContent` 为 null/undefined 时的兼容（旧数据）

### 7.2 前端（vitest）

| 用例 | 预期 |
|---|---|
| 修饰成功 | `previousContent` = 修饰前 content |
| 点撤回 | textContent 恢复、previousContent 清空、按钮消失 |
| 再修饰 | previousContent 覆盖为新修饰前值 |
| 手动编辑（边界a）| previousContent 清空、按钮消失 |
| readOnly | 按钮不显示 |
| isRefining 中 | 按钮不显示 |

### 7.3 手动验证

- 修饰某页 → 撤回 → 刷新 → 撤回态保留
- A 设备修饰 → B 设备打开 → B 也能看到撤回按钮（多设备一致）

## 8. 回滚

- schema：`previousContent` 可空，移除字段不影响现有数据（反向迁移）
- 前端：撤回按钮由 `previousContent` 有无驱动，无字段时按钮不显示，自然降级
- prompt/修饰主流程：本次变更不改 `slide_refine` prompt，修饰本身不受影响
