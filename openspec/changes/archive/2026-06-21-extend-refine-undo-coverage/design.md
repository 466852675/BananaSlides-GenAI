# 设计：撤回功能覆盖扩展

## 1. ResultCard 边界 a 修正

### 现状（[src/components/ResultCard.tsx:309](src/components/ResultCard.tsx#L309)）

```typescript
onChange={(e) => !readOnly && onUpdate && onUpdate({ textContent: e.target.value, previousContent: undefined })}
```

手动编辑时主动清空 `previousContent`，撤回按钮消失（边界 a）。

### 改后

```typescript
onChange={(e) => !readOnly && onUpdate && onUpdate({ textContent: e.target.value })}
```

去掉 `previousContent: undefined`，手动编辑不清空锚点，撤回按钮保留。

### 测试更新

`src/components/ResultCard.test.tsx` 中"手动编辑 textarea 时 onUpdate 清空 previousContent"用例改为"手动编辑不清空 previousContent（撤回锚点保留）"。

## 2. 设计要求撤回（App.tsx）— 持久化方案

### 设计原则

**与 ResultCard 的 `Slide.previousContent` 完全对称——锚点持久化到数据库，刷新/退出重进后撤回按钮仍在。**

设计要求（`config.requirements`）本身入库（`globalConfig` JSON），撤回锚点也必须入库，避免"数据持久但锚点丢失"的不对称。

### 数据方案

锚点存储为 `config.previousRequirements`（`StyleConfig` 新增可选字段），作为 `globalConfig` JSON 的子字段，随 `handleConfigChange` → auto-save → `updateProjectMutation` 入库。刷新后 `transformProject` 的 `JSON.parse(globalConfig)` 自然带出，**无需额外读取映射、无需 schema 变更、无需 `useRef`/`useState`**。

### 类型变更（[src/types.ts:12](src/types.ts#L12) `StyleConfig`）

```typescript
export interface StyleConfig {
  styleName: string;
  colorPalette: string;
  requirements: string;
  previousRequirements?: string;   // 新增：设计要求撤回锚点（随 globalConfig 入库）
  aspectRatio: string;
  targetPageCount: number;
  defaultVariantCount: number;
  pageStructure: PageStructure;
}
```

### `handleRefineRequirements` 改造（[src/App.tsx:1955](src/App.tsx#L1955)）

修饰开始时（`setIsRefiningRequirements(true)` 之前）：

```typescript
handleConfigChange("previousRequirements", config.requirements);
```

流式/最终仍走 `handleConfigChange("requirements", ...)`（不变）。

### 撤回 onClick

```typescript
const handleUndoRequirementsRefine = () => {
  if (!config.previousRequirements) return;
  handleConfigChange("requirements", config.previousRequirements);
  handleConfigChange("previousRequirements", "");  // 清空锚点
};
```

→ `handleConfigChange` → `setConfig` → 500ms auto-save → `updateProjectMutation` 写回 `globalConfig`（requirements 恢复 + previousRequirements 清空，一起入库）。

### UI

撤回按钮位置：紧挨 AI修饰按钮（[src/App.tsx:4604](src/App.tsx#L4604) 现有 `</button>` 后），`absolute bottom-3 right-[4.5rem]`，`Undo2` 图标 + "撤回修饰"。

显示条件：`config.previousRequirements && !isRefiningRequirements && !previewSnapshot`

## 3. OutlineGenerator 主题/文件内容撤回（本地 ref 方案）

### 设计原则

`topic`/`fileParsedContent` 是模态框内本地 state（不入库），撤回锚点用本地 `useRef` 与数据生命周期一致。模态框关闭后锚点随组件销毁——符合预期（模态框都没了，撤回无意义）。

### 数据方案

| 存储 | 类型 | 用途 |
|---|---|---|
| `previousTopicRef` | `useRef<string \| null>` | Tab1 主题旧值 |
| `previousFileContentRef` | `useRef<string \| null>` | Tab2 文件内容旧值 |

### `handleRefine` 改造（[src/components/OutlineGenerator.tsx:342](src/components/OutlineGenerator.tsx#L342)）

修饰开始时（`setIsRefining(true)` 之前）：

```typescript
if (activeTab === 'file') {
  previousFileContentRef.current = fileParsedContent;
} else {
  previousTopicRef.current = topic;
}
```

流式/最终仍走 `setTopic`/`setFileParsedContent`（不变）。组件因 state 变化 re-render，撤回按钮（检查 ref）自动出现。

### 撤回按钮（两个 Tab）

**Tab1 主题撤回**（[src/components/OutlineGenerator.tsx:1100](src/components/OutlineGenerator.tsx#L1100) AI修饰按钮旁）：
- 显示：`previousTopicRef.current !== null && !isRefining`
- onClick：`setTopic(previousTopicRef.current!); previousTopicRef.current = null;`

**Tab2 文件内容撤回**（[src/components/OutlineGenerator.tsx:1199](src/components/OutlineGenerator.tsx#L1199) AI修饰按钮旁）：
- 显示：`previousFileContentRef.current !== null && !isRefining`
- onClick：`setFileParsedContent(previousFileContentRef.current!); previousFileContentRef.current = null;`

### "清空"按钮同步清锚点

- **Tab1 清空**（[src/components/OutlineGenerator.tsx:1088](src/components/OutlineGenerator.tsx#L1088)）：原 `onClick={() => setTopic('')}`，追加 `previousTopicRef.current = null;`
- **Tab2 清空**（`handleClearFileAndContent` 确认回调内）：追加 `previousFileContentRef.current = null;`

## 4. 统一边界规则

| 场景 | ResultCard | 设计要求 | OutlineGenerator |
|---|---|---|---|
| 再修饰 | 覆盖 previousContent（单步） | 覆盖 previousRequirements（单步） | 覆盖对应 ref（单步） |
| **手动编辑** | **不清空**（修正后） | **不清空** | **不清空** |
| **刷新/退出** | DB 持久 ✅ | **DB 持久 ✅（修正后）** | 本地 state 丢失（合理） |
| readOnly | 不显示 | 不显示（previewSnapshot） | N/A（模态框无 readOnly） |
| 修饰中 | 不显示 | 不显示 | 不显示 |
| 显式清空 | N/A | N/A | 清空锚点 |

**统一原则**：持久化数据（Slide.content / config.requirements）的撤回锚点也持久化；临时数据（topic / fileParsedContent）的撤回锚点随数据生命周期。

## 5. 改动文件清单

| 文件 | 操作 | 责任 |
|---|---|---|
| `src/components/ResultCard.tsx` | modify | textarea onChange 去掉 `previousContent: undefined` |
| `src/components/ResultCard.test.tsx` | modify | 边界 a 测试改为"手动编辑不清空" |
| `src/types.ts` | modify | `StyleConfig` 加 `previousRequirements?: string` |
| `src/App.tsx` | modify | import Undo2 + handleRefineRequirements 存旧值 + handleUndoRequirementsRefine + 撤回按钮 JSX（**无 ref/state**） |
| `src/__tests__/components/RequirementsRefineUndo.test.tsx`（新建） | create | 设计要求撤回用例（含刷新持久验证） |
| `src/components/OutlineGenerator.tsx` | modify | import Undo2 + 两个 ref + handleRefine 存旧值 + 两个撤回按钮 + 清空同步 |
| `src/components/OutlineGenerator.test.tsx`（新建，若不存在） | create | OutlineGenerator 撤回用例 |

## 6. 关键假设（实现时验证）

1. App.tsx `handleConfigChange`（:1597）是 partial merge 且触发 auto-save（add-slide-refine-undo 已验证）
2. `transformProject`（projects.ts:133）的 `JSON.parse(globalConfig)` 会自然带出 `previousRequirements` 子字段（无需额外映射代码）——实现时用一个测试验证刷新后 `config.previousRequirements` 仍有值
3. OutlineGenerator 的 `topic`/`fileParsedContent` 是组件内 state，关闭模态框销毁（符合设计）
4. App.tsx AI修饰按钮区 `absolute bottom-3 right-3`，撤回按钮放 `right-[4.5rem]` 不重叠
5. `handleConfigChange("previousRequirements", "")` 用空串清空（`config.previousRequirements` 为 falsy 时按钮隐藏）—— 注意不要用 `null`/`undefined`，因 `handleConfigChange` 的 value 参数会进入 `globalConfig` JSON，空串比 null 更干净
