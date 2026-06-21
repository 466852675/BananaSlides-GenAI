# 变更提案：单页 AI修饰撤回（previousContent 持久化）

## 背景与动机

YH-AI 工作台中，用户对单页 `textContent` 点"AI修饰"后，`ResultCard.handleSmartRefine`（[src/components/ResultCard.tsx:142](src/components/ResultCard.tsx#L142)）通过 `onUpdate({ textContent: refined })` 直接覆盖，并经 `syncSlidesMutation` 写入 `Slide.content`。**旧内容没有保存到任何地方**——修饰一旦完成，原文彻底丢失。

- `Slide` schema（[server/prisma/schema.prisma:455](server/prisma/schema.prisma#L455)）无任何历史/撤回字段
- `handleSmartRefine` 修饰时不存旧值，`onUpdate` 直接覆盖 `textContent`

**用户痛点**：AI修饰是"试错性"高频操作（修饰后看效果，不满意想退回），当前完全无法支持——用户不满意只能靠记忆重打。刷新后更无从恢复。

## 目标

1. **单步撤回** — 点撤回回到最近一次修饰前的内容
2. **持久化** — 刷新页面 / 切页 / 重开项目后仍可撤回
3. **多设备一致** — 撤回态随项目数据走（采用数据库字段方案，不存 localStorage）
4. **不覆盖手动编辑** — 撤回窗口仅在"刚修饰完、未手动改"时有效（边界 a）

## 范围

### 包含

- `Slide` 表新增可空字段 `previousContent String?`
- 前端 `GeneratedSlide` 类型 + 后端 slide service/validator/syncSlides 同步字段
- `handleSmartRefine` 修饰开始时存旧值到 `previousContent`
- `ResultCard` 新增"撤回修饰"按钮 + 撤回逻辑（恢复 content、清空 previousContent）
- 边界 a：手动编辑 textarea 时清空 `previousContent`，撤回按钮消失

### 不包含

- 多步撤回历史栈（YAGNI，单步覆盖"修饰试错"场景）
- 撤回其他操作（生图、大纲生成、设计要求修饰等）
- 跨操作的项目级版本回退（沿用现有 `snapshot.service` 快照系统）
- localStorage 方案（已评估并否决，理由见 design.md）

## 约束

| 约束 | 说明 |
|------|------|
| **数据库持久化** | `previousContent` 入库，随项目走；不存 localStorage（避免多设备割裂、清缓存丢失） |
| **单步语义** | 只保留最近一次修饰前的值，再修饰覆盖，不累积历史 |
| **撤回必入库** | 撤回通过 `syncSlidesMutation` 把 `content` 改回旧值 + 清 `previousContent`，不只在前端临时改 |
| **边界 a（默认）** | 手动编辑 textarea 清空 `previousContent`，保护用户手改不被撤回覆盖 |
| **复用现有数据流** | 沿用 `onUpdate` + `syncSlidesMutation`，不引入第二条持久化通道 |
| **无独立后端 API** | 撤回走现有 `syncSlides`，不新增端点 |

## 技术方案

详见 [design.md](./design.md)。核心要点：

1. **数据模型**：`Slide` 加 `previousContent String?`，开发环境 `prisma db push`，生产 `migrate`
2. **修饰存旧值**：`handleSmartRefine` 开始时 `onUpdate({ previousContent: item.textContent })`，流式与最终仍按现状更新 `textContent`
3. **撤回**：`onUpdate({ textContent: previousContent, previousContent: undefined })`，触发 `syncSlides` 改回 content + 清 previousContent
4. **边界 a**：textarea `onChange` 时 `onUpdate` 清空 `previousContent`

## 验收标准

- ✅ AI修饰成功后，该页 `Slide.previousContent` = 修饰前的 content，并入库
- ✅ 撤回按钮在 `previousContent` 有值 且 `!isRefining && !readOnly` 时显示
- ✅ 点击撤回：`textContent` 恢复、`previousContent` 清空、撤回按钮消失、变更入库
- ✅ 刷新页面 / 切页再切回 / 重开项目，撤回态保留、按钮仍可用
- ✅ 再修饰覆盖 `previousContent`（单步语义）
- ✅ 手动编辑 textarea 后 `previousContent` 清空、撤回按钮消失（边界 a）
- ✅ readOnly（快照预览）模式不显示撤回按钮
- ✅ 修饰进行中（isRefining）不显示撤回按钮

## 风险与对策

| 风险 | 对策 |
|------|------|
| schema 迁移 | 开发环境 `prisma db push`；生产 `prisma migrate deploy`；`previousContent` 可空，旧数据兼容 |
| `onUpdate` 签名不符假设（非 partial merge / 不触发 syncSlides） | 实现 Slice 1 先验证 `onUpdate` 行为，不符则调整传递方式 |
| `previousContent` 残留导致幽灵撤回 | 撤回清空、手动编辑清空、再修饰覆盖——三个出口都置 null |
| 多设备并发修饰同一页 | `previousContent` 单字段，最后写入胜出（可接受，修饰本是单人操作） |
| 数据库每页多存一份历史文本 | textContent 是短文本（几百字），几十页项目增量可忽略 |

## 关联

- 修饰入口：[src/components/ResultCard.tsx:142](src/components/ResultCard.tsx#L142) `handleSmartRefine`
- 修饰服务调用：[src/App.tsx:1999](src/App.tsx#L1999) `handleRefineSlideContent`（走 `slide_refine` 类型）
- 数据流：`onUpdate` → `syncSlidesMutation`（CLAUDE.md 规定幻灯片更新必须走此 mutation）
- 数据模型：[server/prisma/schema.prisma:455](server/prisma/schema.prisma#L455) `model Slide`
- 前端类型：[src/types.ts:27](src/types.ts#L27) `GeneratedSlide`
