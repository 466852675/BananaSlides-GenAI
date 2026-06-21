# 实现任务：单页 AI修饰撤回

## 1. 数据层

- [x] 1.1 [server/prisma/schema.prisma](server/prisma/schema.prisma) `model Slide` 新增 `previousContent String?`
- [x] 1.2 运行 `cd server && npx prisma db push` 同步开发数据库（并验证 `Slide` 表实际新增列）
- [x] 1.3 [src/types.ts](src/types.ts) `GeneratedSlide` 新增 `previousContent?: string`
- [x] 1.4 [server/src/services/slide.service.ts](server/src/services/slide.service.ts)（或等价 service）：读取/序列化 `previousContent`
- [x] 1.5 [server/src/validators/index.ts](server/src/validators/index.ts) `syncSlides` schema 允许 `previousContent` 为可空字符串
- [x] 1.6 [src/api/projects.ts](src/api/projects.ts) `syncSlidesMutation`：前端 `previousContent` → 后端 `previousContent` 字段映射

## 2. 修饰存旧值

- [x] 2.1 验证 `onUpdate` 行为：读 [src/App.tsx](src/App.tsx) 中传给 `ResultCard` 的 `onUpdate` 定义，确认是 partial merge 且触发 debounced syncSlides（若不符，调整传递方式）
- [x] 2.2 [src/components/ResultCard.tsx](src/components/ResultCard.tsx) `handleSmartRefine`：修饰开始时 `onUpdate({ previousContent: item.textContent })` 存旧值（在流式 chunk 之前）

## 3. 撤回交互

- [x] 3.1 [src/components/ResultCard.tsx](src/components/ResultCard.tsx) 新增"撤回修饰"按钮（`Undo` 图标 + 文案，次级低强调样式），位于 AI修饰按钮旁
- [x] 3.2 显示条件：`item.previousContent && !isRefining && !readOnly`
- [x] 3.3 撤回 onClick：`onUpdate({ textContent: item.previousContent, previousContent: undefined })`

## 4. 边界处理（边界 a）

- [x] 4.1 [src/components/ResultCard.tsx](src/components/ResultCard.tsx) textarea `onChange`：`onUpdate({ textContent: newValue, previousContent: undefined })`（手动编辑清空撤回锚点）

## 5. 测试

- [x] 5.1 后端 `cd server && bun test`：syncSlides 写入/读取 `previousContent`；旧数据（null）兼容（4 pass / 0 fail + null 边界 + upsert update 分支）
- [x] 5.2 前端 `npx vitest run`：修饰存旧值、撤回恢复、再修饰覆盖、手动编辑清空、readOnly/修饰中不显示按钮（9 pass / 0 fail）
- [x] 5.3 提交前 `lsp_diagnostics` 检查修改文件

## 6. 手动验证

- [ ] 6.1 工作台某页 AI修饰 → 撤回 → content 恢复、按钮消失
- [ ] 6.2 修饰后刷新页面 → 撤回按钮仍在、可用
- [ ] 6.3 修饰后手动编辑 → 撤回按钮消失
- [ ] 6.4 readOnly 快照预览 → 撤回按钮不显示
