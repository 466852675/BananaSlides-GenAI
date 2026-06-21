# 实现任务：撤回功能覆盖扩展 + 边界 a 统一修正

## 1. ResultCard 边界 a 修正

- [x] 1.1 [src/components/ResultCard.tsx:309](src/components/ResultCard.tsx#L309) textarea `onChange` 去掉 `previousContent: undefined`
- [x] 1.2 [src/components/ResultCard.test.tsx](src/components/ResultCard.test.tsx) "手动编辑清空 previousContent"用例改为"手动编辑不清空 previousContent（撤回锚点保留）"

## 2. 设计要求撤回（App.tsx，持久化方案）

- [x] 2.1 [src/App.tsx](src/App.tsx) import `Undo2` from lucide-react
- [x] 2.2 [src/types.ts:12](src/types.ts#L12) `StyleConfig` 加 `previousRequirements?: string`
- [x] 2.3 [src/App.tsx:1955](src/App.tsx#L1955) `handleRefineRequirements` 开始时 `handleConfigChange("previousRequirements", config.requirements);`（在 setIsRefiningRequirements(true) 之前）
- [x] 2.4 新增 `handleUndoRequirementsRefine`：`handleConfigChange("requirements", config.previousRequirements); handleConfigChange("previousRequirements", "");`
- [x] 2.5 [src/App.tsx:4604](src/App.tsx#L4604) AI修饰按钮后加撤回按钮 JSX（`Undo2` + "撤回修饰"），显示条件 `config.previousRequirements && !isRefiningRequirements && !previewSnapshot`

## 3. OutlineGenerator 主题/文件内容撤回（本地 ref 方案）

- [x] 3.1 [src/components/OutlineGenerator.tsx](src/components/OutlineGenerator.tsx) import `Undo2` from lucide-react
- [x] 3.2 新增 `previousTopicRef = useRef<string | null>(null)` + `previousFileContentRef = useRef<string | null>(null)`
- [x] 3.3 [src/components/OutlineGenerator.tsx:342](src/components/OutlineGenerator.tsx#L342) `handleRefine` 开始时按 `activeTab` 存对应 ref
- [x] 3.4 [src/components/OutlineGenerator.tsx:1100](src/components/OutlineGenerator.tsx#L1100) Tab1 AI修饰按钮旁加主题撤回按钮 + onClick
- [x] 3.5 [src/components/OutlineGenerator.tsx:1199](src/components/OutlineGenerator.tsx#L1199) Tab2 AI修饰按钮旁加文件内容撤回按钮 + onClick
- [x] 3.6 [src/components/OutlineGenerator.tsx:1088](src/components/OutlineGenerator.tsx#L1088) Tab1 清空按钮 onClick 追加 `previousTopicRef.current = null;`
- [x] 3.7 `handleClearFileAndContent` 确认回调内追加 `previousFileContentRef.current = null;`

## 4. 测试

- [x] 4.1 [src/components/ResultCard.test.tsx](src/components/ResultCard.test.tsx) 边界 a 修正用例（9/9 pass）
- [ ] 4.2 设计要求撤回 vitest（mock smartRefineAuto，验证存旧值/撤回恢复/手动编辑不清空/刷新后 previousRequirements 仍有值）— **未实现，技术债务**
- [ ] 4.3 OutlineGenerator 撤回 vitest（mock smartRefineAuto，验证两个 Tab 存旧值/撤回恢复/清空同步）— **未实现，技术债务**

## 5. 验证

- [x] 5.1 `npx vitest run` ResultCard.test.tsx（9/9 pass）+ `bun test` slide-previous-content（4/4 pass）
- [x] 5.2 提交前 `lsp_diagnostics` 检查修改文件（无类型错误）
- [x] 5.3 手动验证（重启后端后）：
