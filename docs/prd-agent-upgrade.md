# YH-AI PPT 智能体升级 PRD v2.5

**版本**: v2.5
**日期**: 2026-03-29
**状态**: 已完成全面核查和结构优化，可进入实施阶段

**版本历史**：

- v2.4：补充风险诊断、数据模型、异常处理、集成方案
- v2.5：补充权限设计、资源管理、SSE认证、速率限制，优化文档结构

***

## 文档目录

### 第一部分：产品需求

- 一、核心设计：双模式架构
- 二、界面设计（含状态同步、完成工作流）
- 三、功能需求
- 四、技术选型

### 第二部分：技术设计

- 五、数据模型设计
- 六、API设计

### 第三部分：安全与限制

- 七、权限系统设计（含SSE认证增强）
- 八、速率限制设计

### 第四部分：资源管理

- 九、资源管理设计

### 第五部分：风险与应对

- 十、风险诊断与解决方案
- 十一、异常处理矩阵
- 十二、扩展数据模型
- 十三、验收标准补充

### 第六部分：集成方案

- 十四、与现有代码的集成方案

### 第七部分：实施与验收

- 十五、实施计划
- 十六、验收标准

### 第八部分：附录

- 十七、已确认事项汇总
- 十八、错误处理补充
- 十九、风险评估更新

***

# 第一部分：产品需求

## 一、核心设计：双模式架构

### 1.1 设计理念

**工作台模式** 和 **Agent模式** 是同一项目的两种视图，共享数据层：

```
┌─────────────────────────────────────────────────────────────────┐
│                     Workbench Page                              │
├─────────────────────────────────────────────────────────────────┤
│  [工作台] ←──Tab切换──→ [🤖 Agent]                              │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────────────────┐    │
│  │   工作台视图       │      │   Agent视图                  │    │
│  │  • 项目卡片列表   │      │  • 对话历史                  │    │
│  │  • 手动编辑操作   │      │  • 自然语言交互              │    │
│  │  • 批量生成按钮   │      │  • 任务进度卡片              │    │
│  └────────┬─────────┘      └──────────────┬───────────────┘    │
│           └───────────────┬───────────────┘                     │
│                           ▼                                     │
│           ┌───────────────────────────────┐                    │
│           │      共享状态层                │                    │
│           │  items / config / styleMap    │                    │
│           └───────────────┬───────────────┘                    │
│                           ▼                                     │
│           ┌───────────────────────────────┐                    │
│           │      WebSocket 实时同步        │                    │
│           └───────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 用户确认的设计决策

| 决策项    | 选择                   | 说明                |
| ------ | -------------------- | ----------------- |
| 项目绑定   | **一个对话绑定一个项目**       | Agent对话始终围绕当前项目   |
| 对话历史   | **按项目保存**            | 每个项目独立的对话历史       |
| 模式关系   | **同一页面Tab切换**        | 共享状态，无缝切换         |
| 同步机制   | **WebSocket实时同步**    | Agent操作实时反映到工作台   |
| 入口位置   | **顶部导航栏Tab切换**       | Logo右侧，与现有导航一致    |
| 历史展示   | **可收起侧边栏**           | 左侧边栏显示所有项目对话历史    |
| 进度展示   | **对话内嵌卡片**           | 任务进度在对话气泡内显示      |
| 项目状态   | **侧边栏项目卡片**          | 每个项目显示进度条、状态标签    |
| 执行模式   | **分步确认（默认）**         | 每个大环节需用户确认，可选自动执行 |
| 模式切换位置 | **消息输入框旁**           | 勾选"自动执行"选项        |
| 引导方式   | **多轮对话引导**           | Agent主动提问引导用户逐步完成 |
| 导出格式   | **PPTX / PDF / 图片包** | 完成后可选择多种导出方式      |
| 导入功能   | **支持多种格式**           | PPTX、PDF、Word等    |
| 计费时机   | **环节开始前预扣**          | 每个环节执行前显示预估积分     |

### 1.3 初始欢迎界面

新建对话时显示引导内容，而非空白：

**界面元素**：

1. **主题示例**（3-5个）：常见PPT主题，点击自动填入输入框
   - 产品发布会、年度总结、项目汇报、教学课件、商业计划
2. **风格模板**（3-5个）：从"我的收藏"取风格卡片，与工作台模板间保持一致
3. **底部功能区**：配置按钮、风格按钮、附件按钮、自动执行选项

### 1.4 支持的使用场景

| 场景          | 描述              | Agent行为        |
| ----------- | --------------- | -------------- |
| **新建PPT**   | 用户说需求，Agent引导创建 | 多轮对话收集信息，逐步生成  |
| **中断恢复**    | 之前生成到一半中断       | 自动检测未完成项目，提示继续 |
| **修改现有项目**  | 修改已完成的PPT       | 识别修改意图，执行修改工具  |
| **上传参考资料**  | 上传文档/图片作为参考     | 解析内容，融入生成      |
| **模板/风格复用** | 使用收藏的风格模板       | 应用风格到生成过程      |
| **导入现有文档**  | 导入PPTX/PDF/Word | 解析内容，重新生成PPT   |

### 1.5 核心功能流程

```
用户发起需求
    ↓
Agent多轮对话收集信息（主题、页数、风格）
    ↓
生成大纲 → [用户确认] → 生成内容 → [用户确认] → 生成配图 → [用户确认] → 导出
    ↑
（勾选"自动执行"则跳过确认，一气呵成）
```

***

## 二、界面设计

### 2.1 整体布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  YH-AI PPT  │ [工作台] [🤖 Agent]                │ 用户头像 ▼       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │ [«] 收起    [+新建]│  │                                             │   │
│  │                    │  │              对话区域                         │   │
│  │  历史项目          │  │                                             │   │
│  │                    │  │  [Agent] 👋 您好！我是AI助手...              │   │
│  │  ┌──────────────┐  │  │                                             │   │
│  │  │ 🎯 AI发展   │  │  │  [用户] 帮我做一个关于AI发展的PPT            │   │
│  │  │ ████████░░ 80%│  │  │                                             │   │
│  │  │ 内容生成中   │  │  │  [Agent] 正在生成内容...                     │   │
│  │  └──────────────┘  │  │           ┌───────────────────────────┐      │   │
│  │                    │  │           │ 任务进度             60%  │      │   │
│  │  ┌──────────────┐  │  │           │ ████████████░░░░░░░░     │      │   │
│  │  │ 📋 产品发布 │  │  │           │ 正在生成第6页             │      │   │
│  │  │ ██████████ 100%│ │  │           │ 已消耗：18积分            │      │   │
│  │  │ ✅ 已完成    │  │  │           └───────────────────────────┘      │   │
│  │  └──────────────┘  │  │                                             │   │
│  │                    │  │                                             │   │
│  └────────────────────┘  └─────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [📎] [输入您的需求...                              ] [☐ 自动执行] [发送] │   │
│  │ [⚙️配置] [🎨风格]                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 侧边栏项目卡片

每个项目卡片显示：

```
┌──────────────────────────┐
│ 🎯 项目名称              │  ← 状态图标 + 标题
│ ████████████░░░░ 75%     │  ← 整体进度条
│ 📄 8/10页 · ⏳ 内容生成中 │  ← 详细状态
└──────────────────────────┘
```

**状态图标说明**：

| 图标 | 状态  | 说明          |
| -- | --- | ----------- |
| 🎯 | 进行中 | Agent正在执行任务 |
| ⏸️ | 已暂停 | 用户暂停或等待确认   |
| ✅  | 已完成 | 所有内容生成完毕    |
| ❌  | 失败  | 任务执行出错      |
| 📝 | 待开始 | 新建项目，未开始生成  |

### 2.3 对话消息操作

**用户消息支持编辑和重发**：

```
┌─────────────────────────────────────────────────────────────────┐
│  [用户] 帮我做一个关于AI发展的PPT，大概10页                      │
│         ┌─────────────────────────────────────────────────┐    │
│         │ [✏️ 编辑] [🔄 重置至此]                           │    │
│         └─────────────────────────────────────────────────┘    │
│                                                                 │
│  [Agent] 已为您生成10页大纲...                                  │
│                                                                 │
│  [用户] 修改为12页                                              │
│         ┌─────────────────────────────────────────────────┐    │
│         │ [✏️ 编辑] [🔄 重置至此]                           │    │
│         └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**操作说明**：

| 操作       | 图标 | 功能       | 影响                |
| -------- | -- | -------- | ----------------- |
| **编辑**   | ✏️ | 编辑用户消息内容 | 修改后可选择"重发"或"取消"   |
| **重置至此** | 🔄 | 从此消息重新开始 | 清除该消息之后的所有对话和生成结果 |

**重置至此节点的行为**：

1. 清除该用户消息之后的所有对话记录
2. 撤销该消息之后生成的所有幻灯片内容
3. 项目状态回退到该消息发送前的状态
4. Agent重新响应该消息

**编辑消息的流程**：

```
用户点击 [✏️ 编辑]
    ↓
消息变为可编辑状态
    ↓
用户修改内容
    ↓
[取消] [重发]
    ↓
选择"重发"：
  - 清除该消息之后的对话
  - 撤销后续生成的内容
  - Agent重新响应修改后的消息
```

**注意事项**：

- 只有用户消息可以编辑
- Agent消息不支持编辑
- 编辑/重置操作不可撤销
- 涉及积分消耗的操作重置时自动退还积分

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [📎] [输入您的需求...                              ] [☐ 自动执行] [发送]   │
│  [⚙️配置] [🎨风格]                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**功能按钮说明**：

| 按钮         | 功能     | 说明                    |
| ---------- | ------ | --------------------- |
| **📎 附件**  | 上传参考资料 | 支持PPTX、PDF、Word、图片等格式 |
| **⚙️ 配置**  | 打开配置面板 | 设置页数、比例、变体数等全局配置      |
| **🎨 风格**  | 打开风格选择 | 从"我的收藏"中选择风格模板        |
| **☐ 自动执行** | 切换执行模式 | 勾选后自动执行全流程            |

**风格选择规则**：

- 底部输入区的风格选择与对话区的风格卡片选择**互斥**
- 选择任一处，另一处自动取消选中
- 风格选择后，后续生成的所有图片都应用该风格

### 2.4 Agent引导流程（多轮对话）

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent 引导流程图                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户: 帮我做一个PPT                                            │
│    ↓                                                            │
│  Agent: 好的！请问您的PPT主题是什么？                            │
│    ↓                                                            │
│  用户: AI发展历程                                               │
│    ↓                                                            │
│  Agent: 明白了。您希望大约多少页？（推荐10页）                   │
│    ↓                                                            │
│  用户: 10页                                                     │
│    ↓                                                            │
│  Agent: 请选择风格偏好：[商务简约] [科技感] [创意活泼]           │
│    ↓                                                            │
│  用户: 科技感                                                   │
│    ↓                                                            │
│  Agent: 为您生成大纲中...                                       │
│         ┌─────────────────────────────────────┐                 │
│         │ 大纲已生成（共10页）                 │                 │
│         │ [修改大纲] [确认并生成内容]         │                 │
│         └─────────────────────────────────────┘                 │
│    ↓                                                            │
│  用户: 确认并生成内容                                           │
│    ↓                                                            │
│  Agent: 正在生成内容...（显示进度卡片）                         │
│    ↓                                                            │
│  Agent: 内容生成完成！是否继续生成配图？                        │
│         [生成配图] [稍后再说]                                   │
│    ↓                                                            │
│  Agent: 全部完成！您可以：                                      │
│         [导出PPTX] [导出PDF] [下载图片包] [切换到工作台查看]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 执行模式

#### 分步确认模式（默认）

每个大环节执行完毕后暂停，等待用户确认：

| 环节   | 确认内容       | 用户操作                  |
| ---- | ---------- | --------------------- |
| 大纲生成 | 查看大纲结构，可修改 | \[修改大纲] \[确认继续]       |
| 内容生成 | 查看每页内容     | \[修改内容] \[生成配图]       |
| 配图生成 | 查看配图效果     | \[重新生成] \[导出文件]       |
| 导出文件 | 选择导出格式     | \[PPTX] \[PDF] \[图片包] |

#### 自动执行模式

用户勾选"自动执行"后，Agent一气呵成执行全流程，显示总进度和各环节状态，用户可随时暂停或取消。

***

### 2.6 状态同步详解

### 2A.1 共享状态定义

工作台模式和Agent模式共享同一套状态数据：

```typescript
interface SharedProjectState {
  // 项目元数据
  currentProjectId: string | null;
  projectTitle: string;
  projectStatus: 'idle' | 'generating' | 'completed' | 'failed';

  // 核心数据（双向同步）
  items: GeneratedSlide[];      // 幻灯片列表
  config: StyleConfig;          // 风格配置
  styleMap: GlobalStyleMap;     // 风格图片映射

  // Agent特有状态
  agentSessionId: string | null;
  agentProgress: number;        // 0-100
  agentCurrentStep: string;
}
```

### 2A.2 双向同步机制

```
┌─────────────────────────────────────────────────────────────────┐
│                      状态更新流向                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  【工作台模式操作】                                              │
│                                                                 │
│  用户修改标题 → 更新本地状态 → WebSocket广播                     │
│              → Agent模式收到 → 更新Agent上下文                   │
│                                                                 │
│  用户修改风格 → 更新本地状态 → WebSocket广播                     │
│              → Agent模式收到 → 后续生成应用新风格                │
│                                                                 │
│  用户删除页面 → 更新本地状态 → WebSocket广播                     │
│              → Agent模式收到 → 更新项目进度计算                  │
│                                                                 │
│  【Agent模式操作】                                               │
│                                                                 │
│  Agent生成大纲 → WebSocket推送 → 工作台收到                      │
│              → 更新items → 卡片列表显示新大纲                    │
│                                                                 │
│  Agent生成内容 → WebSocket推送 → 工作台收到                      │
│              → 更新items → 卡片内容实时更新                      │
│                                                                 │
│  Agent生成配图 → WebSocket推送 → 工作台收到                      │
│              → 更新items → 卡片图片实时显示                      │
│                                                                 │
│  Agent修改风格 → WebSocket推送 → 工作台收到                      │
│              → 更新config → 风格面板同步更新                     │
│                                                                 │
│  【关键原则】                                                    │
│  - 两种模式操作同一套数据源                                      │
│  - 任何更新通过WebSocket广播到所有客户端                         │
│  - 切换模式时不重置状态，保持数据一致性                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2A.3 项目状态映射（Agent ↔ 工作台）

Agent模式侧边栏的项目状态与工作台模式的项目卡片状态一一对应：

| Agent侧边栏状态 | 工作台卡片状态 | 数据来源                                  |
| ---------- | ------- | ------------------------------------- |
| 🎯 进行中 80% | 生成中     | `AgentTask.progress` + `Slide.status` |
| ⏸️ 已暂停     | 待确认     | `AgentSession.status = 'paused'`      |
| ✅ 已完成      | 已完成     | `Project.status = 'completed'`        |
| ❌ 失败       | 失败      | `AgentTask.status = 'failed'`         |
| 📝 待开始     | 空闲      | `Project.status = 'idle'`             |

**进度计算逻辑**：

```
项目总进度 = (已完成环节权重 + 当前环节进度) / 总权重

权重分配：
- 大纲生成: 10%
- 内容生成: 50%  (每页 5%)
- 配图生成: 30%  (每页 3%)
- 导出文件: 10%

示例：10页PPT，生成到第6页内容
进度 = 10% + (5 × 5%) + (0 × 3%) = 35%
```

### 2A.4 WebSocket事件详细定义

**服务端 → 客户端事件**：

| 事件名                      | 数据结构                                                      | 触发时机      |
| ------------------------ | --------------------------------------------------------- | --------- |
| `project:items_updated`  | `{ items: Slide[], projectId: string }`                   | 幻灯片列表任何变化 |
| `project:config_updated` | `{ config: StyleConfig, projectId: string }`              | 风格配置变化    |
| `project:status_updated` | `{ status: string, progress: number, projectId: string }` | 项目状态变化    |
| `agent:task_progress`    | `{ taskId, progress, message, currentStep }`              | 任务进度更新    |
| `agent:task_completed`   | `{ taskId, result, pointsUsed }`                          | 任务完成      |
| `agent:task_failed`      | `{ taskId, error, refundAmount }`                         | 任务失败      |
| `agent:message`          | `{ messageId, role, content, timestamp }`                 | Agent消息   |

**客户端 → 服务端事件**：

| 事件名                      | 数据结构                                             | 触发时机      |
| ------------------------ | ------------------------------------------------ | --------- |
| `project:join`           | `{ projectId: string }`                          | 进入项目/切换项目 |
| `project:leave`          | `{ projectId: string }`                          | 离开项目      |
| `agent:send_message`     | `{ projectId, sessionId, message, autoExecute }` | 发送对话消息    |
| `agent:cancel_task`      | `{ taskId: string }`                             | 取消任务      |
| `agent:reset_to_message` | `{ messageId: string }`                          | 重置到某消息节点  |

***

### 2.7 最终完成工作流

### 2B.1 页面预览与展示

当Agent完成所有生成环节后，在对话界面展示完整预览：

```
┌─────────────────────────────────────────────────────────────────┐
│  [Agent] 🎉 您的PPT已完成！以下是所有页面预览：                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   PPT页面预览区                            │ │
│  │                                                           │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │ │
│  │  │ 1   │ │ 2   │ │ 3   │ │ 4   │ │ 5   │               │ │
│  │  │封面 │ │目录 │ │内容 │ │内容 │ │内容 │  ← 缩略图      │ │
│  │  │ ○   │ │ ○   │ │ ○   │ │ ○   │ │ ○   │  ← 选择状态    │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │ │
│  │                                                           │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │ │
│  │  │ 6   │ │ 7   │ │ 8   │ │ 9   │ │ 10  │               │ │
│  │  │内容 │ │内容 │ │内容 │ │内容 │ │结束 │               │ │
│  │  │ ○   │ │ ●   │ │ ○   │ │ ○   │ │ ○   │  ← 第7页选中  │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │ │
│  │                                                           │ │
│  │  已选择: 第7页 - "深度学习时代"                           │ │
│  │                                                           │ │
│  │  [查看大图] [修改此页] [重新生成此页配图]                 │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  或直接导出全部页面：                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  📊 PPTX    │  │  📄 PDF     │  │  🖼️ 图片包  │             │
│  │             │  │             │  │             │             │
│  │ 可编辑格式  │  │ 易分享格式  │  │ 高清图片ZIP │             │
│  │ 消耗5积分   │  │ 免费        │  │ 消耗3积分   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  或 [切换到工作台] 继续手动编辑                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2B.2 选中页面修改流程

用户点击某个缩略图选中后，可以进入修改模式：

```
用户点击第7页缩略图
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  [Agent] 您选中了第7页"深度学习时代"，请选择修改方式：          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 当前内容预览                                              │ │
│  │                                                           │ │
│  │  标题: 深度学习时代                                       │ │
│  │  内容: 2012年AlexNet夺冠标志着深度学习...                │ │
│  │  配图: [显示当前配图]                                     │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  修改选项：                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ ✏️ 修改标题 │  │ 📝 修改内容 │  │ 🎨 重绘配图 │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  或输入您的修改需求：                                           │
│  [把标题改成"深度学习的崛起"，配图换成更科技感的]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
    ↓
用户输入修改需求
    ↓
Agent执行 modify_slide 工具
    ↓
WebSocket推送更新 → 工作台同步更新该页内容
    ↓
显示修改结果，用户确认或继续修改
```

### 2B.3 导出功能详解

完成所有修改后，用户选择导出：

```
┌─────────────────────────────────────────────────────────────────┐
│                      导出流程                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户选择导出方式                                               │
│    ↓                                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 PPTX 格式                                           │   │
│  │  ├─ 消耗: 5积分                                         │   │
│  │  ├─ 特点: 可在PowerPoint/Keynote中继续编辑             │   │
│  │  ├─ 包含: 所有页面 + 原始布局 + 可编辑文字              │   │
│  │  └─ 适合: 需要后续手动微调的用户                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 PDF 格式                                            │   │
│  │  ├─ 消耗: 免费                                          │   │
│  │  ├─ 特点: 跨平台兼容，易分享                            │   │
│  │  ├─ 包含: 所有页面高清渲染                              │   │
│  │  └─ 适合: 直接演示或发送给他人                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🖼️ 图片包 (ZIP)                                        │   │
│  │  ├─ 消耗: 3积分                                         │   │
│  │  ├─ 特点: 每页独立高清PNG                               │   │
│  │  ├─ 包含: 10张图片 + 缩略图索引                         │   │
│  │  └─ 适合: 插入其他文档或社交分享                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  选择后 → 创建导出任务 → WebSocket推送进度 → 下载链接          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2B.4 项目完成与历史库同步

**关键一致性保证**：

Agent完成的项目与工作台手动创建的项目在历史库中完全一致：

```
┌─────────────────────────────────────────────────────────────────┐
│                  项目完成流程                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agent模式完成生成                                              │
│    ↓                                                            │
│  更新 Project.status = 'completed'                              │
│  更新 Project.completedAt = now()                               │
│  更新 Project.thumbnailUrl = 第一页预览图                       │
│    ↓                                                            │
│  WebSocket广播 project:status_updated                           │
│    ↓                                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  工作台历史库同步更新                                    │   │
│  │                                                         │   │
│  │  新增项目卡片：                                         │   │
│  │  ┌──────────────────────┐                              │   │
│  │  │ [缩略图]             │                              │   │
│  │  │ AI发展历程           │  ← 项目标题                  │   │
│  │  │ ✅ 已完成            │  ← 状态标签                  │   │
│  │  │ 10页 · 2026-03-28    │  ← 页数和完成时间            │   │
│  │  │ 来源: Agent生成      │  ← 可选：标记来源           │   │
│  │  └──────────────────────┘                              │   │
│  │                                                         │   │
│  │  用户点击卡片 → 进入工作台编辑模式                      │   │
│  │  （与手动创建的项目完全相同的编辑体验）                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  【一致性保证】                                                  │
│  - 数据结构相同：Project + Slide 表                             │
│  - 操作能力相同：编辑、删除、重新生成、导出                     │
│  - 状态同步相同：任何模式的修改都实时同步                       │
│  - 历史保留相同：项目快照、版本管理                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**数据来源标记（可选）**：

| 字段                     | 工作台创建                 | Agent创建           |
| ---------------------- | --------------------- | ----------------- |
| `Project.status`       | completed             | completed         |
| `Project.completedAt`  | 有                     | 有                 |
| `Project.thumbnailUrl` | 有                     | 有                 |
| `Slide` 数据             | 完整                    | 完整                |
| 来源标记                   | `source: 'workbench'` | `source: 'agent'` |

来源标记仅用于统计分析，不影响用户使用体验。

***

## 三、功能需求

### 3.1 阶段1：基础设施（P0）

#### F1.1 任务队列系统

**功能点**：

| 功能   | 描述                        |
| ---- | ------------------------- |
| 任务创建 | 用户操作转为后台任务，返回任务ID         |
| 任务查询 | 通过ID查询状态、进度、结果            |
| 进度推送 | WebSocket实时推送任务进度（0-100%） |
| 失败重试 | 任务失败自动重试（最多3次）            |
| 服务恢复 | 服务重启后恢复pending任务          |

#### F1.2 Agent会话管理

**功能点**：

| 功能    | 描述                     |
| ----- | ---------------------- |
| 会话创建  | 用户发起Agent对话时创建会话（绑定项目） |
| 会话恢复  | 用户返回时恢复历史会话            |
| 上下文存储 | 存储当前项目状态、用户偏好、对话历史     |

#### F1.3 WebSocket实时通信

**功能点**：

| 功能   | 描述               |
| ---- | ---------------- |
| 状态同步 | Agent操作实时更新工作台状态 |
| 进度推送 | 任务进度实时推送到前端      |
| 断线重连 | 自动重连 + 降级到轮询     |

***

### 3.2 阶段2：Agent核心能力（P0）

#### F2.1 工具系统（Function Calling）

**核心工具定义**：

| 工具名                      | 功能      | 输入参数                       | 积分消耗 |
| ------------------------ | ------- | -------------------------- | ---- |
| `create_project`         | 创建新项目   | title, style?              | 0    |
| `generate_outline`       | 生成PPT大纲 | topic, pageCount?, style?  | 5    |
| `generate_slide_content` | 生成单页内容  | title, brief, pageType     | 3    |
| `generate_slide_image`   | 生成页面配图  | prompt, style, aspectRatio | 5    |
| `batch_generate_images`  | 批量生成配图  | slideIds\[]                | 按量   |
| `refine_text`            | 文本润色    | text, type                 | 2    |
| `modify_slide`           | 修改幻灯片   | slideId, changes           | 1    |
| `analyze_style`          | 分析风格图片  | imageUrl                   | 3    |
| `import_document`        | 导入文档解析  | fileUrl, fileType          | 3    |

#### F2.2 记忆系统

**功能点**：

| 功能   | 描述                |
| ---- | ----------------- |
| 短期记忆 | 当前会话内的对话历史        |
| 长期记忆 | 跨会话的用户偏好（风格、常用模板） |
| 记忆召回 | 根据当前上下文召回相关记忆     |

#### F2.3 任务规划器

**功能点**：

| 功能   | 描述         |
| ---- | ---------- |
| 目标分析 | 理解用户最终目标   |
| 任务分解 | 将目标分解为步骤序列 |
| 进度估算 | 预估总积分消耗    |
| 异常恢复 | 单步失败时的恢复策略 |

***

### 3.3 阶段3：用户体验升级（P1）

#### F3.1 Agent对话界面

**功能点**：

| 功能   | 描述                |
| ---- | ----------------- |
| 对话输入 | 文本输入框，支持附件上传      |
| 消息展示 | 用户消息和Agent回复的对话气泡 |
| 任务卡片 | Agent创建任务时显示进度卡片  |
| 快捷主题 | 初始界面显示3-5个主题示例    |
| 风格选择 | 从"我的收藏"选择风格模板     |

#### F3.2 配置和风格面板

**配置面板**：

- 目标页数、每页变体数
- 画面比例（16:9 / 4:3 / 1:1）
- 页面结构分配
- 设计要求输入

**风格面板**：

- 显示用户收藏的风格模板
- 单选，与对话区风格卡片互斥
- 预览大图功能

***

### 3.4 阶段4：商业化适配（P1）

#### F4.1 Agent积分计费

**计费规则**：

| 场景   | 计费方式           |
| ---- | -------------- |
| 环节开始 | 显示预估积分，用户确认后预扣 |
| 环节完成 | 实际消耗结算         |
| 环节失败 | 自动退款预扣积分       |
| 批量操作 | 阶梯折扣（10页+ 9折）  |

***

## 四、技术选型

| 组件   | 选择                     | 理由                            |
| ---- | ---------------------- | ----------------------------- |
| 数据库  | **保持 SQLite**          | 简单快速，适合初期开发                   |
| 任务队列 | **SQLite + 定时轮询**      | 轻量持久化，无需Redis依赖               |
| 实时通信 | **SSE 优先 + WebSocket** | SSE用于AI流式输出，WebSocket仅用于多设备同步 |
| 升级方式 | **全面升级**               | 同时推进基础设施、Agent能力、用户体验         |

***

# 第二部分：技术设计

## 五、数据模型设计

### 5.1 新增模型

```prisma
// Agent会话（一个项目一个活跃会话）
model AgentSession {
  id          String   @id @default(uuid())
  userId      String
  projectId   String   @unique

  status      String   @default("active")
  context     String   @default("{}")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  project     Project  @relation(fields: [projectId], references: [id])
  messages    AgentMessage[]
  tasks       AgentTask[]
}

// Agent对话消息
model AgentMessage {
  id          String   @id @default(uuid())
  sessionId   String
  role        String   // user, assistant, system, tool
  content     String
  toolCalls   String?
  taskId      String?
  createdAt   DateTime @default(now())

  session     AgentSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

// Agent后台任务
model AgentTask {
  id          String   @id @default(uuid())
  sessionId   String
  userId      String
  projectId   String

  type        String
  status      String   @default("pending")
  input       String
  output      String?
  error       String?

  progress    Int      @default(0)
  currentStep String?
  pointsUsed  Int?

  createdAt   DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  session     AgentSession @relation(fields: [sessionId], references: [id])
  user        User         @relation(fields: [userId], references: [id])
  project     Project      @relation(fields: [projectId], references: [id])
}

// 用户Agent偏好（长期记忆）
model AgentPreference {
  id          String   @id @default(uuid())
  userId      String   @unique

  preferredStyle    String?
  preferredPalette  String?
  commonPageCount   Int?
  customPrompts     String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
}
```

***

## 六、API设计

### 6.1 新增端点

| 方法   | 端点                                 | 描述      |
| ---- | ---------------------------------- | ------- |
| POST | `/api/agent/chat`                  | Agent对话 |
| POST | `/api/agent/tasks`                 | 创建任务    |
| GET  | `/api/agent/tasks`                 | 任务列表    |
| GET  | `/api/agent/tasks/:id`             | 任务详情    |
| POST | `/api/agent/tasks/:id/cancel`      | 取消任务    |
| GET  | `/api/agent/sessions`              | 会话列表    |
| GET  | `/api/agent/sessions/:id`          | 会话详情    |
| GET  | `/api/agent/sessions/:id/messages` | 对话历史    |

### 6.2 WebSocket事件

**服务端 → 客户端**：

- `project:items_updated` - 项目幻灯片更新
- `project:config_updated` - 项目配置更新
- `agent:task_progress` - 任务进度更新
- `agent:task_completed` - 任务完成
- `agent:message` - Agent消息

**客户端 → 服务端**：

- `project:join` - 加入项目房间
- `project:leave` - 离开项目房间
- `agent:send_message` - 发送对话消息
- `agent:cancel_task` - 取消任务

***

# 第三部分：安全与限制

## 七、权限系统设计

### 7.1 Agent 权限代码定义

基于现有 29 项标准权限体系，新增 Agent 专用权限代码：

| 权限代码                   | 名称        | 说明              | 默认角色          |
| ---------------------- | --------- | --------------- | ------------- |
| `agent.session.create` | 创建Agent对话 | 允许使用Agent模式     | USER+         |
| `agent.task.execute`   | 执行Agent任务 | 允许Agent执行工具调用   | BASIC+        |
| `agent.auto.execute`   | 自动执行模式    | 允许启用自动执行（无分步确认） | PROFESSIONAL+ |
| `agent.batch.generate` | 批量生成操作    | 批量生成配图/内容       | PREMIUM+      |

### 7.2 权限与现有角色映射

| 角色                 | Agent 权限                                     | 说明                |
| ------------------ | -------------------------------------------- | ----------------- |
| USER               | `agent.session.create`                       | 可创建对话，但需手动确认每步    |
| BASIC              | `agent.session.create`, `agent.task.execute` | 可执行 Agent 工具调用    |
| PROFESSIONAL       | + `agent.auto.execute`                       | 可启用自动执行模式         |
| PREMIUM            | + `agent.batch.generate`                     | 可批量生成（效率更高）       |
| ENTERPRISE         | 全部权限                                         | + 优先队列、专属模型       |
| ADMIN/SUPER\_ADMIN | 全部权限 + 管理权限                                  | 可查看所有用户的 Agent 会话 |

### 7.3 权限检查实现

```typescript
// server/src/middlewares/agent-auth.middleware.ts
import { requirePermission } from './auth.middleware';

// Agent 路由权限守卫
export const agentSessionGuard = requirePermission('agent.session.create');
export const agentExecuteGuard = requirePermission('agent.task.execute');
export const agentAutoExecuteGuard = requirePermission('agent.auto.execute');

// 前端权限守卫（复用现有 PermissionGuard）
// src/components/Agent/AgentView.tsx
import { PermissionGuard } from '@/components/common/PermissionGuard';

<PermissionGuard permission="agent.auto.execute">
  <AutoExecuteToggle />
</PermissionGuard>
```

### 7.4 SSE 认证增强

#### 问题分析

现有 SSE 连接仅在建立时验证 Token，存在以下风险：

1. 用户被禁用时不会自动断开连接
2. 长时间连接（AI生成可能几分钟）Token 可能过期
3. 无心跳检测机制

#### 解决方案

```typescript
// server/src/controllers/agent-sse.controller.ts
export const handleAgentSSE = async (req: Request, res: Response) => {
  // 1. 建立连接时验证 Token（现有逻辑）
  const user = req.user; // 已通过 authenticate 中间件

  // 2. 设置心跳检测
  const heartbeatInterval = setInterval(async () => {
    // 验证用户状态
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { status: true, role: true }
    });

    if (currentUser?.status === 'DISABLED') {
      // 用户被禁用，立即断开
      res.write(`data: ${JSON.stringify({ type: 'error', code: 'USER_DISABLED' })}\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
      return;
    }

    // 发送心跳
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000); // 每30秒检测一次

  // 3. Token 刷新支持
  // 前端在 Token 即将过期时通过 HTTP POST 刷新
  // SSE 连接保持不变，刷新后继续有效

  // 4. 清理
  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
};
```

***

## 八、速率限制设计

### 8.1 Agent 专用速率限制

#### 问题分析

Agent 自动执行模式可能短时间内触发大量 AI 调用，需要专用速率限制防止：

1. 用户积分快速消耗
2. AI 服务过载
3. 系统资源竞争

#### 速率限制规则

| 操作类型                 | 限制规则   | VIP 放宽 | 说明           |
| -------------------- | ------ | ------ | ------------ |
| `agent.task.create`  | 10次/小时 | × 2    | 创建 Agent 任务  |
| `agent.auto.execute` | 3次/小时  | × 2    | 自动执行模式       |
| `agent.tool.call`    | 30次/分钟 | × 3    | Agent 工具调用频率 |
| `agent.sse.connect`  | 5个并发   | -      | SSE 连接数限制    |

#### 实现方式

```typescript
// server/src/services/agent-rate-limiter.ts
import { RateLimiter } from './rate-limiter';

export const AGENT_RATE_LIMITS = {
  'agent.task.create': { count: 10, windowSeconds: 3600 },
  'agent.auto.execute': { count: 3, windowSeconds: 3600 },
  'agent.tool.call': { count: 30, windowSeconds: 60 },
};

export class AgentRateLimiter {
  static async checkLimit(
    userId: string,
    operation: keyof typeof AGENT_RATE_LIMITS,
    isVip: boolean
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const limit = AGENT_RATE_LIMITS[operation];
    const multiplier = isVip && operation !== 'agent.sse.connect' ? this.getVipMultiplier(userId) : 1;
    const effectiveLimit = limit.count * multiplier;

    return RateLimiter.check(
      `agent:${operation}:${userId}`,
      effectiveLimit,
      limit.windowSeconds
    );
  }

  static getVipMultiplier(userId: string): number {
    // VIP3+ 用户放宽 × 3
    // VIP1-2 用户放宽 × 2
    return 3; // 简化实现
  }
}
```

### 8.2 SSE 连接数限制

```typescript
// server/src/controllers/agent-sse.controller.ts
// SSE 连接数限制（单用户）
const MAX_SSE_CONNECTIONS_PER_USER = 5;

// 连接前检查
const activeConnections = sseConnectionManager.getUserConnections(userId);
if (activeConnections.length >= MAX_SSE_CONNECTIONS_PER_USER) {
  return res.status(429).json({
    error: 'TOO_MANY_CONNECTIONS',
    message: '您已达到最大连接数限制，请关闭其他标签页后重试'
  });
}
```

***

# 第四部分：资源管理

## 九、资源管理设计

### 9.1 问题背景

现有代码存在以下资源管理问题：

- 项目删除时不清理关联文件
- 无资源生命周期管理
- 无孤立文件清理机制

Agent 模式会频繁生成图片，若不管理将导致存储持续增长。

### 9.2 资源注册表设计

```prisma
// server/prisma/schema.prisma 新增模型
model AssetRegistry {
  id           String   @id @default(uuid())
  path         String   @unique
  type         String   // 'upload' | 'generated' | 'style_reference'
  projectId    String?
  slideId      String?
  size         Int?
  mimeType     String?
  refCount     Int      @default(1)
  createdAt    DateTime @default(now())
  lastAccessed DateTime @updatedAt
  markedForDelete Boolean @default(false)

  project      Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)
  slide        Slide?    @relation(fields: [slideId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([type])
  @@index([markedForDelete])
  @@index([createdAt])
}
```

### 9.3 资源生命周期

```
1. 创建阶段
   AI生成图片 / 用户上传文件
     ↓
   注册到 AssetRegistry，refCount = 1

2. 使用阶段
   Slide.variants 引用 AssetRegistry
     ↓
   每次引用 refCount++，取消引用 refCount--

3. 删除触发
   项目删除 / Slide删除 / 变体替换
     ↓
   refCount--，若 refCount = 0 则 markedForDelete = true

4. 清理阶段
   定时任务（每日凌晨）
     ↓
   删除 markedForDelete=true 且超过7天的资源
```

### 9.4 资源配额限制

| 资源类型    | 单项目上限 | 用户总量上限 | VIP 放宽 |
| ------- | ----- | ------ | ------ |
| 生成图片    | 100张  | 1000张  | × 3    |
| 上传文件    | 50MB  | 500MB  | × 5    |
| Agent会话 | 5个活跃  | 无限制    | -      |

***

# 第五部分：风险与应对

## 十、风险诊断与解决方案

### 10.1 高风险项

**模式切换与状态同步**

- [ ] Tab切换可在工作台/Agent模式间无缝切换
- [ ] 切换时状态保持，无数据丢失
- [ ] 工作台修改实时反映到Agent模式
- [ ] Agent生成内容实时反映到工作台

**Agent对话能力**

- [ ] Agent多轮对话引导用户完成PPT创建
- [ ] 分步确认模式每个环节等待用户确认
- [ ] 自动执行模式显示总进度，可随时暂停
- [ ] 用户消息可编辑，可重置到任意节点
- [ ] 重置操作正确清除后续内容和退还积分

**项目状态展示**

- [ ] 侧边栏显示每个项目的进度和状态
- [ ] 项目状态与工作台卡片状态一一对应
- [ ] 进度计算准确反映当前环节进展

**初始界面**

- [ ] 初始界面显示主题示例和风格模板
- [ ] 点击主题自动填入输入框
- [ ] 风格预览和选择功能正常

**配置面板**

- [ ] 底部配置和风格面板功能正常
- [ ] 配置参数正确应用到生成过程
- [ ] 风格选择与对话区互斥

**WebSocket通信**

- [ ] WebSocket实时同步工作台和Agent状态
- [ ] 断线自动重连
- [ ] 重连后状态一致性恢复

**最终完成流程**

- [ ] 完成后显示所有页面缩略图预览
- [ ] 用户可选中单页进行修改
- [ ] 修改后实时同步更新
- [ ] 导出PPTX/PDF/图片包功能正常

**历史库一致性**

- [ ] Agent完成的项目在工作台历史库正确显示
- [ ] 项目卡片信息完整（缩略图、标题、状态）
- [ ] 点击可进入工作台编辑，体验一致

**积分计费**

- [ ] 任务开始前预扣积分
- [ ] 任务完成后准确结算
- [ ] 任务失败自动退款
- [ ] 重置操作退还相应积分

### 10.2 性能验收

- [ ] WebSocket消息延迟 < 100ms
- [ ] 模式切换响应 < 200ms
- [ ] 100条对话历史加载 < 500ms
- [ ] 任务队列处理能力 > 10任务/秒
- [ ] 10页PPT预览缩略图加载 < 1s

***

## 十一、异常处理矩阵

### 10.1 高风险项

#### R1. 状态管理复杂度过高

**问题描述**：
现有 `App.tsx` 已有 100+ useState，代码量约 53KB，是典型巨型组件。新增 Agent 状态会进一步增加复杂度，状态同步逻辑分散难以维护，存在潜在的状态冲突和竞态条件。

**解决方案：引入 Zustand 状态管理**

```typescript
// src/stores/projectStore.ts - 项目核心状态
import { create } from 'zustand';

interface ProjectState {
  // 核心数据
  currentProjectId: string | null;
  items: GeneratedSlide[];
  config: StyleConfig;
  styleMap: GlobalStyleMap;

  // 操作方法
  setItems: (items: GeneratedSlide[]) => void;
  updateItem: (id: string, update: Partial<GeneratedSlide>) => void;
  setConfig: (config: StyleConfig) => void;

  // 撤销/重做支持
  history: HistoryEntry[];
  undo: () => void;
  redo: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProjectId: null,
  items: [],
  config: defaultConfig,
  styleMap: {},
  history: [],

  setItems: (items) => {
    const history = get().history;
    history.push({ items: get().items, timestamp: Date.now() });
    set({ items, history: history.slice(-50) }); // 保留最近50条
  },

  updateItem: (id, update) => {
    const items = get().items.map(item =>
      item.id === id ? { ...item, ...update } : item
    );
    get().setItems(items);
  },

  undo: () => { /* 撤销实现 */ },
  redo: () => { /* 重做实现 */ },
}));

// src/stores/agentStore.ts - Agent 专用状态
interface AgentState {
  mode: 'idle' | 'conversing' | 'executing';
  sessionId: string | null;
  messages: AgentMessage[];
  currentTask: AgentTask | null;
  autoExecute: boolean;

  createSession: (projectId: string) => Promise<string>;
  sendMessage: (content: string) => Promise<void>;
  resetToMessage: (messageId: string) => Promise<void>;
  pauseTask: () => void;
  resumeTask: () => void;
  cancelTask: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  mode: 'idle',
  sessionId: null,
  messages: [],
  currentTask: null,
  autoExecute: false,
  // 实现细节...
}));
```

**迁移策略**：

1. 创建 Zustand stores，不修改现有 App.tsx
2. 新 Agent 组件使用 Zustand，旧组件保持 useState
3. 逐步迁移，最后删除 App.tsx 中的冗余状态

#### R2. 并发操作冲突处理未定义

**问题描述**：
PRD 未说明当用户在 Agent 生成过程中切换到工作台修改内容时如何处理。场景：Agent 正在生成第 5 页，用户切换到工作台删除第 3 页，Agent 完成后页面索引如何同步？

**解决方案：乐观锁 + 操作队列 + 用户提示**

```typescript
// server/src/services/agent-lock.service.ts
export class AgentLockService {
  private locks: Map<string, ProjectLock> = new Map();

  async acquireLock(projectId: string, userId: string, mode: 'agent' | 'workbench'): Promise<boolean> {
    const existing = this.locks.get(projectId);

    // 无锁或同用户同模式，允许
    if (!existing || (existing.userId === userId && existing.mode === mode)) {
      this.locks.set(projectId, { userId, mode, timestamp: Date.now() });
      return true;
    }

    // 同用户不同模式，提示切换
    if (existing.userId === userId && existing.mode !== mode) {
      throw new LockConflictError(
        `您正在${existing.mode === 'agent' ? 'Agent模式' : '工作台'}操作此项目，是否切换？`
      );
    }

    throw new LockConflictError('其他用户正在操作此项目，请稍后再试');
  }

  releaseLock(projectId: string, userId: string) {
    const lock = this.locks.get(projectId);
    if (lock?.userId === userId) {
      this.locks.delete(projectId);
    }
  }
}
```

**冲突解决流程**：

```
用户 A 在 Agent 模式生成中
用户 A 尝试切换到工作台编辑
    ↓
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 提示：Agent 正在执行任务                                 │
│                                                             │
│  当前进度：内容生成 60%                                      │
│  预计剩余：2 分钟                                            │
│                                                             │
│  [等待完成] [暂停任务并切换] [取消]                          │
└─────────────────────────────────────────────────────────────┘
    ↓
选择"暂停任务并切换"：
  → Agent 任务暂停，状态保存
  → 切换到工作台，允许编辑
  → 编辑完成后提示"是否继续 Agent 任务？"
```

#### R3. WebSocket 基础设施从零开始

**问题描述**：
现有系统没有 WebSocket 支持，仅有 SSE 流式输出。需要从零搭建 WebSocket 服务端和客户端。

**解决方案：SSE + WebSocket 混合架构**

| 场景             | 协议            | 原因        |
| -------------- | ------------- | --------- |
| AI 流式输出（大纲、内容） | **SSE**       | 单向推送，已有实现 |
| Agent 任务进度     | **SSE**       | 单向推送，可复用  |
| 双向控制（暂停、取消）    | **HTTP POST** | 简单可靠      |
| 多设备同步          | **WebSocket** | 需要双向广播    |

**降级策略**：

```
WebSocket 连接失败 → 降级到 SSE + HTTP 轮询（每 2 秒）
SSE 连接失败 → 降级到纯 HTTP 轮询（每 5 秒）
```

### 10.2 中风险项

#### R4. 消息重置回滚机制不完整

**问题描述**：
支持"重置至此节点"功能需要清除后续内容和退还积分，但 `AgentMessage` 缺少版本号、快照字段、积分明细记录。

**解决方案：扩展数据模型**（见 10.4 节）

#### R5. 积分不足时的处理流程

**问题描述**：
用户积分不足以完成整个流程时的体验未定义。场景：用户有 20 积分，预估 10 页 PPT 需要 50 积分。

**解决方案：分段预估 + 降级方案 + 充值引导**

```typescript
// server/src/services/agent-points.service.ts
export class AgentPointsService {
  // 预估整个流程积分
  static estimateTotalPoints(config: StyleConfig): PointsEstimate {
    const pageCount = config.targetPageCount;
    return {
      outline: 5,
      content: pageCount * 3,
      images: pageCount * 5,
      export: 5,
      total: 5 + pageCount * 8 + 5,
      breakdown: [
        { stage: '大纲生成', points: 5 },
        { stage: '内容生成', points: pageCount * 3 },
        { stage: '配图生成', points: pageCount * 5 },
        { stage: '导出文件', points: 5 }
      ]
    };
  }
}
```

**积分不足时的用户界面**：

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ 积分不足                                                    │
├─────────────────────────────────────────────────────────────────┤
│  您的PPT预估需要消耗 90 积分，当前余额 20 积分。                │
│                                                                 │
│  您可以选择：                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📦 基础套餐（35 积分）                                   │   │
│  │ 大纲 + 内容生成 + PDF 导出（不含配图）                   │   │
│  │ [选择此方案]                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 减少页数                                              │   │
│  │ 当前 10 页，调整为 [3] 页，需要 29 积分                  │   │
│  │ [调整后继续]                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💎 充值积分                                              │   │
│  │ 充值 50 积分仅需 ¥9.9                                    │   │
│  │ [立即充值]                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### R6. 自动执行模式的取消策略

**问题描述**：
取消时机、取消后正在执行的 AI 调用如何处理、取消是否需要等待当前步骤完成未明确。

**解决方案：检查点机制 + 优雅终止**

```typescript
// server/src/services/agent-cancel.service.ts
export class AgentCancelService {
  static CANCELLABLE_STATUSES = ['pending', 'running', 'paused'];

  async cancelTask(taskId: string, userId: string): Promise<CancelResult> {
    // 1. 设置取消标志
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'cancelling' }
    });

    // 2. 等待当前步骤完成（最多 30 秒）
    const currentStep = await this.getCurrentStep(task);
    if (currentStep) {
      await this.waitForStepCompletion(currentStep, { timeout: 30000 });
    }

    // 3. 标记已取消
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'cancelled' }
    });

    // 4. 结算已消耗积分（不退款）
    const pointsUsed = await this.calculatePointsUsed(task);

    return {
      success: true,
      pointsUsed,
      message: `任务已取消。已消耗 ${pointsUsed} 积分。`
    };
  }

  // 检查点：AI 调用前检查是否被取消
  async checkCancellation(taskId: string): Promise<boolean> {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { status: true }
    });
    return task?.status === 'cancelling' || task?.status === 'cancelled';
  }
}
```

**检查点植入示例**：

```typescript
// 在工具执行中植入检查点
export async function executeGenerateContent(taskId: string, slides: Slide[]) {
  for (let i = 0; i < slides.length; i++) {
    // 检查点：每次生成前检查取消状态
    if (await cancelService.checkCancellation(taskId)) {
      throw new CancelledError('Task cancelled by user');
    }

    // 执行生成
    const content = await aiService.generateSlideContent(slides[i]);
    await saveResult(slides[i].id, content);
    await updateProgress(taskId, { current: i + 1, total: slides.length });
  }
}
```

#### R7. 多设备/多标签页同步

**问题描述**：
用户可能在多个浏览器标签页打开同一项目，Agent 完成后其他标签页如何更新？

**解决方案：BroadcastChannel + WebSocket 广播**

```typescript
// 前端：跨标签页同步
// src/hooks/useCrossTabSync.ts
export function useCrossTabSync(projectId: string) {
  const channel = useRef<BroadcastChannel | null>(null);
  const { setItems, setConfig } = useProjectStore();

  useEffect(() => {
    channel.current = new BroadcastChannel(`project:${projectId}`);

    channel.current.onmessage = (event) => {
      const { type, data } = event.data;
      switch (type) {
        case 'items_updated':
          setItems(data.items);
          break;
        case 'agent_progress':
          toast.info(`其他标签页正在执行: ${data.step}`);
          break;
      }
    };

    return () => channel.current?.close();
  }, [projectId]);
}

// 后端：WebSocket 多连接广播
export class ProjectBroadcaster {
  private connections: Map<string, Set<WebSocketConnection>> = new Map();

  broadcast(userId: string, projectId: string, event: string, data: any) {
    const key = `${userId}:${projectId}`;
    const conns = this.connections.get(key);
    if (!conns) return;

    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    conns.forEach(conn => conn.send(message));
  }
}
```

***

## 十二、扩展数据模型

### 12.1 AgentMessage 扩展字段

```prisma
model AgentMessage {
  id          String   @id @default(uuid())
  sessionId   String
  role        String   // user, assistant, system, tool
  content     String
  toolCalls   String?
  taskId      String?

  // 新增：支持回滚
  version     Int      @default(1)
  parentId    String?  // 编辑前的消息ID，支持编辑追溯

  // 新增：状态快照
  snapshotId  String?  // 消息发送时的项目快照
  itemsBefore String?  // JSON: 该消息前的 items 状态
  itemsAfter  String?  // JSON: 该消息后的 items 状态

  // 新增：积分追踪
  pointsUsed      Int?
  transactionIds  String? // JSON: 该消息产生的交易ID列表

  createdAt   DateTime @default(now())

  session     AgentSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  snapshot    ProjectSnapshot? @relation(fields: [snapshotId], references: [id])

  @@index([sessionId])
  @@index([sessionId, createdAt])
}
```

### 12.2 新增 AgentOperationLog 审计日志

```prisma
model AgentOperationLog {
  id           String   @id @default(uuid())
  sessionId    String
  messageId    String?
  operation    String   // 'edit', 'reset', 'retry', 'cancel'

  // 状态变更
  beforeState  String   // JSON
  afterState   String   // JSON

  // 积分变更
  pointsBefore Int?
  pointsAfter  Int?
  pointsRefund Int?

  // 元数据
  reason       String?
  ipAddress    String?

  createdAt    DateTime @default(now())

  session      AgentSession @relation(fields: [sessionId], references: [id])

  @@index([sessionId, createdAt])
}
```

### 12.3 Project 模型扩展

```prisma
model Project {
  // ... 现有字段 ...

  // 新增：来源标记
  source          String   @default("workbench") // 'workbench' | 'agent'
  agentSessionId  String?  // 如果由 Agent 创建，关联会话ID
}
```

### 12.4 ProjectSnapshot 扩展

```prisma
model ProjectSnapshot {
  id          String   @id @default(uuid())
  projectId   String
  version     Int
  summary     String?
  data        String

  // 新增：关联来源
  source      String   @default("manual") // 'manual' | 'agent_message' | 'agent_checkpoint'
  messageId   String?  // 如果是 Agent 消息触发的快照

  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  messages    AgentMessage[]

  @@index([projectId, version])
}
```

***

## 十三、验收标准补充

### 13.1 并发控制验收

- [ ] Agent 执行时切换到工作台，正确显示锁定提示
- [ ] 选择"暂停并切换"，Agent 任务正确暂停
- [ ] 工作台编辑后返回 Agent，正确提示是否继续
- [ ] 多用户同时操作同一项目，正确拒绝

### 13.2 回滚机制验收

- [ ] 重置到某消息，后续消息正确删除
- [ ] 重置后幻灯片内容正确恢复
- [ ] 重置后积分正确退还
- [ ] 操作日志正确记录

### 13.3 积分处理验收

- [ ] 积分不足时正确显示降级方案
- [ ] 选择降级方案后正确执行部分流程
- [ ] 充值后可以继续完整流程

### 13.4 取消策略验收

- [ ] 自动执行模式可以随时取消
- [ ] 取消后当前步骤优雅终止
- [ ] 取消后已完成内容保留
- [ ] 取消后积分不退还（符合预期）

### 13.5 多设备同步验收

- [ ] 同一用户多标签页，状态实时同步
- [ ] Agent 模式执行中，其他标签页显示进度提示
- [ ] WebSocket 断开后降级到轮询正常工作

***

# 第六部分：集成方案

## 十四、与现有代码的集成方案

### 14.1 现有机制可直接复用

#### 积分系统（完全复用）

现有实现已支持完整的预扣/退款流程：

```typescript
// 已有：server/src/services/points.service.ts

// 预扣积分（带乐观锁和重试）
await PointsService.deductPoints(userId, actionCode, projectId, description, multiplier, options);

// 标记交易完成
await PointsService.completeTransaction(transactionId);

// 失败时退款
await PointsService.refundPoints(userId, amount, transactionId, reason);

// VIP 价格判断
const cost = await PointsService.getActionCost(actionCode, userId);
```

**Agent 工具调用时的积分处理**：

```typescript
// Agent 工具执行器直接复用现有积分服务
async executeTool(toolName: string, params: any, context: AgentContext) {
  // 1. 映射工具名到 actionCode
  const actionCode = TOOL_TO_ACTION_CODE[toolName];
  // generate_outline → 'outline_generation'
  // generate_slide_content → 'slide_content'
  // generate_slide_image → 'slide_image'

  // 2. 调用现有积分服务
  const deductResult = await PointsService.deductPoints(
    context.userId, actionCode, context.projectId
  );

  if (!deductResult.success) {
    return { success: false, error: deductResult.message };
  }

  try {
    // 3. 执行工具
    const result = await this.tools[toolName].handler(params, context);

    // 4. 标记完成
    await PointsService.completeTransaction(deductResult.transactionId);

    return { success: true, result, pointsUsed: deductResult.deductedAmount };
  } catch (error) {
    // 5. 失败退款
    await PointsService.refundPoints(
      context.userId, deductResult.deductedAmount, deductResult.transactionId
    );
    throw error;
  }
}
```

#### 流式输出（复用现有 SSE）

现有 SSE 端点可直接扩展用于 Agent 进度推送：

```typescript
// 已有：server/src/controllers/ai.controller.ts
// Agent 任务进度可复用相同的 SSE 模式

export const handleAgentTaskProgress = async (req: Request, res: Response) => {
  // 复用现有的 SSE 响应头设置
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const { taskId } = req.params;

  while (true) {
    const task = await prisma.agentTask.findUnique({ where: { id: taskId } });

    // 发送进度事件
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      taskId,
      progress: task.progress,
      step: task.currentStep,
      status: task.status
    })}\n\n`);

    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      res.write(`data: ${JSON.stringify({ type: 'done', task })}\n\n`);
      break;
    }

    await sleep(500);
  }

  res.end();
};
```

#### 项目快照（复用现有 API）

现有快照系统支持完整的历史管理：

```typescript
// 已有 API：
// POST   /api/projects/:projectId/snapshots
// GET    /api/projects/:projectId/snapshots
// POST   /api/snapshots/:snapshotId/restore

// Agent 消息快照可以调用现有服务
import { snapshotService } from './services/snapshot.service';

// 创建快照（在消息发送前）
const snapshot = await snapshotService.create(projectId, {
  summary: `Agent消息前的快照`,
  data: JSON.stringify(currentProjectState)
});

// 恢复快照（在消息重置时）
await snapshotService.restore(snapshotId);
```

#### 幻灯片同步（复用现有 API）

```typescript
// 已有：PATCH /api/projects/:id/slides
// Agent 工具可直接调用

async updateSlides(projectId: string, slides: GeneratedSlide[]) {
  const response = await client.patch(`/projects/${projectId}/slides`, {
    slides: slides.map(slide => ({
      id: slide.id,
      pageType: slide.pageType,
      contentType: slide.contentType,
      title: slide.title,
      content: slide.textContent,
      brief: slide.brief,
      variants: JSON.stringify(slide.variants),
      variantCount: slide.variantCount,
      previewUrl: slide.previewUrl,
      status: slide.status
    }))
  });
  return response.data;
}
```

### 14.2 状态管理集成方案

#### 现有 viewMode 系统扩展

```typescript
// 现有：src/App.tsx
// 扩展 viewMode 类型，新增 'agent'

type ViewMode = 'landing' | 'dashboard' | 'workbench' | 'agent' | 'history' | 'templates' | 'admin' | 'login' | 'messages';

// Agent 模式作为 viewMode 的一个值
const [viewMode, setViewMode] = useState<ViewMode>(() => { ... });

// 渲染逻辑
{viewMode === 'agent' && (
  <AgentView
    // 共享现有状态
    currentProjectId={currentProjectId}
    items={items}
    config={config}
    styleMap={styleMap}
    // 共享现有操作
    setItems={setItems}
    setConfig={setConfig}
    setStyleMap={setStyleMap}
    setCurrentProjectId={setCurrentProjectId}
  />
)}
```

#### 共享状态的访问方式

Agent 模式与工作台模式共享状态，无需引入新的状态管理库：

```typescript
// AgentView 组件接收现有的状态和操作
interface AgentViewProps {
  // 共享状态
  currentProjectId: string | null;
  items: GeneratedSlide[];
  config: StyleConfig;
  styleMap: GlobalStyleMap;

  // 共享操作
  setItems: Dispatch<SetStateAction<GeneratedSlide[]>>;
  setConfig: Dispatch<SetStateAction<StyleConfig>>;
  setStyleMap: Dispatch<SetStateAction<GlobalStyleMap>>;
  setCurrentProjectId: Dispatch<SetStateAction<string | null>>;

  // 用户上下文
  user: User | null;
}

export function AgentView({
  currentProjectId, items, config, styleMap,
  setItems, setConfig, setStyleMap, setCurrentProjectId,
  user
}: AgentViewProps) {
  // Agent 内部状态
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);

  // ... Agent 逻辑
}
```

### 14.3 实时通信架构（SSE 优先）

#### 架构选择

| 场景          | 协议               | 原因        |
| ----------- | ---------------- | --------- |
| AI 流式输出     | **复用现有 SSE**     | 已有完善实现    |
| Agent 任务进度  | **复用现有 SSE**     | 单向推送，足够使用 |
| 用户控制（暂停/取消） | **HTTP POST**    | 简单可靠      |
| 多设备同步       | **新增 WebSocket** | 仅此场景需要    |

#### 新增 SSE 端点

```typescript
// server/src/routes/agent.routes.ts
router.get('/tasks/:taskId/progress', handleAgentTaskProgress);  // SSE 进度流
router.post('/tasks/:taskId/cancel', handleCancelTask);          // HTTP 取消
router.post('/tasks/:taskId/pause', handlePauseTask);            // HTTP 暂停
router.post('/tasks/:taskId/resume', handleResumeTask);          // HTTP 继续
```

#### WebSocket 仅用于多设备同步

```typescript
// 仅在检测到同一用户多设备连接时使用
export class ProjectBroadcaster {
  // 广播到用户的所有连接
  broadcast(userId: string, projectId: string, event: string, data: any) {
    // 通过 WebSocket 推送到用户的所有设备
  }
}
```

### 14.4 数据模型与现有模型的映射

#### AgentMessage 与 ProjectSnapshot 的关系

```typescript
// AgentMessage 引用现有快照，而非存储完整数据
model AgentMessage {
  id          String   @id @default(uuid())
  sessionId   String
  role        String
  content     String

  // 关联现有快照系统
  snapshotId  String?  // 引用 ProjectSnapshot

  // 积分追踪
  pointsUsed  Int?
  transactionIds String?

  // 关联
  snapshot    ProjectSnapshot? @relation(fields: [snapshotId], references: [id])
}

// 重置消息时调用现有快照恢复
async resetToMessage(messageId: string) {
  const message = await prisma.agentMessage.findUnique({
    where: { id: messageId },
    include: { snapshot: true }
  });

  if (message.snapshot) {
    // 复用现有快照恢复 API
    await snapshotService.restore(message.snapshot.id);
  }

  // 删除后续消息
  await prisma.agentMessage.deleteMany({
    where: { sessionId: message.sessionId, createdAt: { gt: message.createdAt } }
  });
}
```

#### AgentTask 与现有 AI 调用的关系

```typescript
// AgentTask 记录任务状态，实际执行调用现有 AI 服务
model AgentTask {
  id          String   @id @default(uuid())
  sessionId   String
  type        String   // 对应现有 actionCode
  status      String

  // 输入输出
  input       String   // JSON
  output      String?  // JSON

  // 进度
  progress    Int      @default(0)
  currentStep String?

  // 积分
  pointsUsed  Int?
  transactionIds String?  // JSON 数组，一次任务可能多次扣费
}

// 执行任务时调用现有 AI 服务
async executeTask(task: AgentTask) {
  switch (task.type) {
    case 'generate_outline':
      // 调用现有 AIService
      const outline = await AIService.generateOutline(...);
      break;
    case 'generate_slide_content':
      const content = await AIService.generateSlideDetail(...);
      break;
    case 'generate_slide_image':
      const image = await AIService.generateSlideVariant(...);
      break;
  }
}
```

### 14.5 集成检查清单

#### 完全复用（无需修改）

- [x] `PointsService` - 积分预扣、结算、退款
- [x] `AIService` - 所有 AI 调用方法
- [x] `snapshotService` - 快照创建和恢复
- [x] `projectService.syncSlides` - 幻灯片同步
- [x] SSE 流式输出基础设施

#### 扩展使用

- [ ] `viewMode` 类型 - 新增 'agent'
- [ ] `AgentMessage` 模型 - 新增，但引用现有快照
- [ ] `AgentSession` 模型 - 新增
- [ ] `AgentTask` 模型 - 新增
- [ ] Agent 专用 SSE 端点 - 新增

#### 新增实现

- [ ] `AgentView` 组件
- [ ] `AgentService` - Agent 核心逻辑
- [ ] WebSocket 服务（仅多设备同步）
- [ ] Agent API 路由

### 14.6 实施优先级（基于现有代码）

| 优先级 | 任务                                        | 依赖现有代码          | 工作量 |
| --- | ----------------------------------------- | --------------- | --- |
| P0  | 扩展 viewMode，创建 AgentView 组件               | App.tsx         | 低   |
| P0  | 新增 AgentMessage/AgentSession/AgentTask 模型 | Prisma          | 低   |
| P1  | 创建 AgentService，调用现有 AI 服务                | AIService       | 中   |
| P1  | 创建 Agent API 路由                           | Express         | 低   |
| P2  | 实现消息快照（引用现有 ProjectSnapshot）              | snapshotService | 低   |
| P2  | 创建 WebSocket 服务（多设备同步）                    | 无               | 中   |
| P3  | 状态管理优化（独立任务）                              | 无               | 高   |

***

# 第七部分：实施与验收

## 十五、实施计划

### 15.1 里程碑

| 阶段         | 周次     | 交付物                                    |
| ---------- | ------ | -------------------------------------- |
| P1-基础设施    | W1-3   | AgentTask模型 + QueueService + WebSocket |
| P2-Agent能力 | W4-7   | 工具系统 + 记忆系统 + 任务规划器                    |
| P3-用户体验    | W8-10  | Agent对话界面 + 配置面板 + 风格选择                |
| P4-优化验收    | W11-12 | 积分适配 + 测试验收                            |

***

## 十六、验收标准

### 16.1 功能验收

**模式切换与状态同步**

- [ ] Tab切换可在工作台/Agent模式间无缝切换
- [ ] 切换时状态保持，无数据丢失
- [ ] 工作台修改实时反映到Agent模式
- [ ] Agent生成内容实时反映到工作台

**Agent对话能力**

- [ ] Agent多轮对话引导用户完成PPT创建
- [ ] 分步确认模式每个环节等待用户确认
- [ ] 自动执行模式显示总进度，可随时暂停
- [ ] 用户消息可编辑，可重置到任意节点
- [ ] 重置操作正确清除后续内容和退还积分

**项目状态展示**

- [ ] 侧边栏显示每个项目的进度和状态
- [ ] 项目状态与工作台卡片状态一一对应
- [ ] 进度计算准确反映当前环节进展

**初始界面**

- [ ] 初始界面显示主题示例和风格模板
- [ ] 点击主题自动填入输入框
- [ ] 风格预览和选择功能正常

**配置面板**

- [ ] 底部配置和风格面板功能正常
- [ ] 配置参数正确应用到生成过程
- [ ] 风格选择与对话区互斥

**WebSocket通信**

- [ ] WebSocket实时同步工作台和Agent状态
- [ ] 断线自动重连
- [ ] 重连后状态一致性恢复

**最终完成流程**

- [ ] 完成后显示所有页面缩略图预览
- [ ] 用户可选中单页进行修改
- [ ] 修改后实时同步更新
- [ ] 导出PPTX/PDF/图片包功能正常

**历史库一致性**

- [ ] Agent完成的项目在工作台历史库正确显示
- [ ] 项目卡片信息完整（缩略图、标题、状态）
- [ ] 点击可进入工作台编辑，体验一致

**积分计费**

- [ ] 任务开始前预扣积分
- [ ] 任务完成后准确结算
- [ ] 任务失败自动退款
- [ ] 重置操作退还相应积分

### 16.2 性能验收

- [ ] WebSocket消息延迟 < 100ms
- [ ] 模式切换响应 < 200ms
- [ ] 100条对话历史加载 < 500ms
- [ ] 任务队列处理能力 > 10任务/秒
- [ ] 10页PPT预览缩略图加载 < 1s

***

# 第八部分：附录

## 十七、已确认事项汇总

本次PRD经过多轮沟通确认，以下事项均已明确：

### 17.1 架构设计

- ✅ 双模式架构：工作台模式（保持不变）+ Agent模式（新增）
- ✅ Tab切换入口：顶部导航栏Logo右侧
- ✅ 状态同步机制：WebSocket实时双向同步
- ✅ 项目绑定关系：一个对话绑定一个项目

### 17.2 界面设计

- ✅ Agent模式布局：可收起侧边栏 + 对话区 + 底部功能区
- ✅ 侧边栏项目卡片：显示进度条、状态图标、页数信息
- ✅ 初始欢迎界面：主题示例 + 风格模板预览
- ✅ 底部功能区：附件、配置、风格、自动执行选项

### 17.3 对话交互

- ✅ 引导方式：多轮对话，Agent主动提问
- ✅ 执行模式：分步确认（默认），可选自动执行
- ✅ 消息操作：用户消息支持编辑和重置至此节点
- ✅ 积分处理：重置时自动退还后续消耗积分

### 17.4 状态同步

- ✅ 共享状态：items、config、styleMap、currentProjectId
- ✅ 状态映射：Agent侧边栏状态与工作台卡片状态一一对应
- ✅ 进度计算：按环节权重计算总进度

### 17.5 完成流程

- ✅ 页面预览：完成后展示所有页面缩略图
- ✅ 单页修改：可选中单页进行内容/配图修改
- ✅ 导出格式：PPTX（可编辑）、PDF（易分享）、图片包（高清PNG）
- ✅ 历史库同步：Agent完成项目与工作台创建项目完全一致

### 17.6 工具系统

- ✅ 9个核心工具已定义（创建项目、生成大纲、生成内容、生成配图等）
- ✅ 积分预扣/结算/退款机制已明确
- ✅ 批量操作阶梯折扣（10页+ 9折）

***

## 十八、错误处理补充

### 18.1 Agent 任务部分成功处理

#### 问题场景

一个 Agent 任务可能包含多个 AI 调用，可能出现部分成功：

- 大纲生成成功，10页内容生成成功，但2页配图失败
- 或：大纲成功，但第3页内容生成失败

#### 处理策略

| 场景     | 处理策略          | 用户提示           | 积分处理   |
| ------ | ------------- | -------------- | ------ |
| 大纲生成失败 | 任务终止，积分退还     | "大纲生成失败，积分已退还" | 全额退款   |
| 部分内容失败 | 标记失败页面，允许重试   | "X页生成失败，可点击重试" | 仅退还失败页 |
| 部分配图失败 | 标记失败图片，允许重新生成 | "X张配图生成失败"     | 仅退还失败图 |
| 全部成功   | 任务完成          | "🎉 所有页面生成完成！" | 不退款    |

#### 数据模型扩展

```typescript
// AgentTask 输出结果格式
interface AgentTaskResult {
  status: 'completed' | 'partial' | 'failed';
  successCount: number;
  failedCount: number;
  failedItems: Array<{
    slideId: string;
    slideIndex: number;
    operation: 'content' | 'image';
    error: string;
    pointsRefunded: number;
  }>;
  totalPointsUsed: number;
  totalPointsRefunded: number;
}
```

### 18.2 用户中断保护

Agent 模式下，用户尝试关闭页面时显示确认弹窗：

```typescript
// src/hooks/useAgentInterruptGuard.ts
export function useAgentInterruptGuard(
  agentMode: boolean,
  currentTask: AgentTask | null
) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (agentMode && currentTask?.status === 'running') {
        e.preventDefault();
        e.returnValue = 'Agent 正在执行任务，关闭页面可能导致积分损失。确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [agentMode, currentTask]);
}
```

***

## 十九、风险评估更新

### 19.1 新增风险项

| 风险               | 概率 | 影响    | 缓解措施                | 状态    |
| ---------------- | -- | ----- | ------------------- | ----- |
| SSE 连接期间用户被禁用    | 低  | 未授权操作 | 心跳检测 + 状态验证         | ✅ 已解决 |
| 孤立文件累积           | 高  | 存储浪费  | 资源注册表 + 定期清理        | ✅ 已解决 |
| Agent 批量调用触发速率限制 | 中  | 任务中断  | Agent 专用速率限制 + 排队机制 | ✅ 已解决 |
| WebSocket 连接劫持   | 低  | 安全风险  | Token 验证 + 消息签名     | ✅ 已解决 |
| 部分任务成功           | 中  | 用户困惑  | 明确提示失败项 + 重试入口      | ✅ 已解决 |

### 19.2 PRD 完整性评估更新

| 方面    | 评分    | 说明              |
| ----- | ----- | --------------- |
| 架构设计  | ★★★★☆ | 双模式架构合理，与现有代码兼容 |
| 功能覆盖  | ★★★★★ | 核心功能完整，边界情况已补充  |
| 技术可行性 | ★★★★★ | 可大量复用现有代码       |
| 安全设计  | ★★★★★ | 权限系统完整，SSE 认证增强 |
| 资源管理  | ★★★★★ | 已补充完整生命周期管理     |
| 错误处理  | ★★★★★ | 已补充部分成功处理和中断保护  |
| 速率限制  | ★★★★★ | 已补充 Agent 专用限制  |

### 19.3 最终确认事项

| 类别 | 事项              | 状态 |
| -- | --------------- | -- |
| 权限 | Agent 专用权限代码已定义 | ✅  |
| 权限 | SSE 认证增强已设计     | ✅  |
| 资源 | 资源注册表模型已设计      | ✅  |
| 资源 | 生命周期管理流程已定义     | ✅  |
| 错误 | 部分成功处理已设计       | ✅  |
| 错误 | 用户中断保护已设计       | ✅  |
| 速率 | Agent 专用速率限制已定义 | ✅  |
| 速率 | SSE 连接数限制已定义    | ✅  |

***

**文档状态**：v2.5 版本完成，结构优化，内容完整，可进入实施阶段

#### 问题分析

现有 SSE 连接仅在建立时验证 Token，存在以下风险：

1. 用户被禁用时不会自动断开连接
2. 长时间连接（AI生成可能几分钟）Token 可能过期
3. 无心跳检测机制

#### 解决方案

```typescript
// server/src/controllers/agent-sse.controller.ts
export const handleAgentSSE = async (req: Request, res: Response) => {
  // 1. 建立连接时验证 Token（现有逻辑）
  const user = req.user; // 已通过 authenticate 中间件

  // 2. 设置心跳检测
  const heartbeatInterval = setInterval(async () => {
    // 验证用户状态
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { status: true, role: true }
    });

    if (currentUser?.status === 'DISABLED') {
      // 用户被禁用，立即断开
      res.write(`data: ${JSON.stringify({ type: 'error', code: 'USER_DISABLED' })}\n\n`);
      clearInterval(heartbeatInterval);
      res.end();
      return;
    }

    // 发送心跳
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000); // 每30秒检测一次

  // 3. Token 刷新支持
  // 前端在 Token 即将过期时通过 HTTP POST 刷新
  // SSE 连接保持不变，刷新后继续有效

  // 4. 清理
  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
};
```

#### 前端配合

```typescript
// src/hooks/useAgentSSE.ts
export function useAgentSSE(taskId: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const { refreshToken } = useAuth();

  useEffect(() => {
    const eventSource = new EventSource(`/api/agent/tasks/${taskId}/progress`, {
      // 通过 URL 参数传递 Token（SSE 不支持自定义 Header）
    });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'heartbeat') {
        // 心跳响应，连接正常
        setStatus('connected');
        return;
      }

      if (data.type === 'error' && data.code === 'USER_DISABLED') {
        // 用户被禁用
        setStatus('error');
        eventSource.close();
        return;
      }

      // 处理进度数据...
    };

    eventSource.onerror = () => {
      setStatus('disconnected');
      // 自动重连逻辑
    };

    return () => eventSource.close();
  }, [taskId]);
}
```

***

**文档状态**：v2.5 版本完成，结构优化，内容完整，可进入实施阶段
