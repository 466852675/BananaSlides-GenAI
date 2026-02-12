# 实施计划: [FEATURE]

**分支**: `[###-feature-name]` | **日期**: [DATE] | **规范**: [link]
**输入**: 来自 `/specs/[###-feature-name]/spec.md` 的功能规范

**注意**: 此模板由 `/speckit.plan` 命令填充. 执行工作流程请参见 `.specify/templates/commands/plan.md`.

## 摘要

[从功能规范中提取: 主要需求 + 研究得出的技术方法]

## 技术背景

<!-- BananaSlides-GenAI 技术栈 - 根据章程 III. 混合架构一致性 -->

**语言/版本**: TypeScript 5.9 (前端 React 19.2, 后端 Node.js 22 LTS)
**主要依赖**: 
  - 前端: React 19.2 + Vite 6.2 + Tailwind CSS v4.1 + Tanstack Query v5.9
  - 后端: Express v5.2 + Prisma v6.19
  - AI: 自定义 Router-Adapter (Gemini/GLM/DeepSeek/本地模型)
**存储**: SQLite (开发) / PostgreSQL (生产) - 通过 Prisma ORM 管理
**测试**: Vitest (单元) + Playwright (E2E)
**目标平台**: Web 浏览器 (Chrome 90+, Edge, Firefox, Safari)
**项目类型**: Web 应用 (前后端分离)
**性能目标**: 
  - 首屏加载 < 2s
  - AI 生成响应 < 30s (首图)
  - API 响应 p95 < 200ms
**约束条件**: 
  - 遵循章程 V: TypeScript 编译零错误
  - AI 模型必须通过 Router-Adapter (禁止直接调用)
  - 所有 API 响应遵循统一格式
**规模/范围**: [根据功能调整, 例如: 支持 X 并发生成任务]

## 章程检查

*门控: 必须在阶段 0 研究前通过. 阶段 1 设计后重新检查. *

根据 `.specify/memory/constitution.md` 验证以下原则:

### I. AI 模型路由抽象
- [ ] 功能涉及 AI 调用时，设计通过 Router-Adapter 而非直接 SDK 调用
- [ ] 适配器接口定义符合现有 `server/src/services/ai/` 模式
- [ ] 支持通过环境变量切换模型提供商

### II. 意图驱动设计  
- [ ] 每个用户故事都有明确的价值主张
- [ ] 复杂操作有一键式入口设计
- [ ] 错误消息使用用户语言（非技术术语）

### III. 混合架构一致性
- [ ] API 端点遵循现有错误码规范
- [ ] 新增数据库实体同步更新 Prisma schema
- [ ] 前端类型定义与后端接口同步

### IV. 全链路可观测性
- [ ] 关键操作包含日志记录设计
- [ ] AI 生成任务包含追踪 ID
- [ ] 性能指标采集点已识别

### V. 工业级交付标准
- [ ] 关键业务逻辑识别测试需求
- [ ] 无 `as any` 或 `@ts-ignore` 绕过计划
- [ ] 文档更新清单已列出

## 项目结构

### 文档(此功能)

```
specs/[###-feature]/
├── plan.md              # 此文件 (/speckit.plan 命令输出)
├── research.md          # 阶段 0 输出 (/speckit.plan 命令)
├── data-model.md        # 阶段 1 输出 (/speckit.plan 命令)
├── quickstart.md        # 阶段 1 输出 (/speckit.plan 命令)
├── contracts/           # 阶段 1 输出 (/speckit.plan 命令)
└── tasks.md             # 阶段 2 输出 (/speckit.tasks 命令 - 非 /speckit.plan 创建)
```

### 源代码(仓库根目录)
<!-- BananaSlides-GenAI 标准结构 - 遵循章程 III. 混合架构一致性 -->

```
# Web 应用结构 (前后端分离)
frontend/                          # React 19 + Vite 前端
├── src/
│   ├── api/                      # API 客户端 (与后端契约同步)
│   ├── components/               # 可复用 UI 组件
│   │   ├── ui/                  # 基础组件 (Button, Input, Modal)
│   │   └── [feature]/           # 功能特定组件
│   ├── pages/                    # 路由页面组件
│   ├── hooks/                    # 自定义 React Hooks
│   ├── stores/                   # 客户端状态管理
│   ├── types/                    # TypeScript 类型定义
│   └── utils/                    # 工具函数
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json

server/                           # Express 5 + Prisma 后端
├── src/
│   ├── routes/                   # API 路由定义
│   ├── services/                 # 业务逻辑层
│   │   ├── ai/                  # AI Router-Adapter (章程 I)
│   │   ├── [domain]/            # 领域服务 (order, project, user...)
│   │   └── [feature]/           # 功能特定服务
│   ├── middleware/               # Express 中间件
│   ├── prisma/
│   │   └── schema.prisma        # 数据库模型定义
│   └── types/                    # 共享类型定义
├── tests/
│   ├── unit/
│   └── integration/
└── package.json

docs/                             # 项目文档
├── 01_Project_Overview/         # 项目概览
├── 02_System_Design/            # 系统设计
├── 03_Feature_Specs/            # 功能规范
├── 04_Manuals/                  # 操作手册
└── 05_Testing/                  # 测试文档
```

**结构决策**: [记录所选结构并引用上面捕获的真实目录]

## 复杂度跟踪

*仅在章程检查有必须证明的违规时填写*

| 违规 | 为什么需要 | 拒绝更简单替代方案的原因 |
|-----------|------------|-------------------------------------|
| [例如: 第 4 个项目] | [当前需求] | [为什么 3 个项目不够] |
| [例如: 仓储模式] | [特定问题] | [为什么直接数据库访问不够] |
