# ⚙️ server - 后端模块

[< 返回根目录](../CLAUDE.md)

---

## 概述

BananaSlides-GenAI 的后端服务模块，基于 **Node.js 22 + Express 5.2 + Prisma ORM + SQLite** 构建。

### 核心职责

- **API 服务**: RESTful API 设计与实现
- **业务逻辑**: 核心业务流程处理
- **AI 路由**: 混合 AI 引擎调度
- **数据持久化**: 数据库访问与模型管理
- **文件存储**: 上传文件管理

---

## 目录结构

```
server/
├── src/
│   ├── app.ts                 # 应用入口
│   ├── bootstrap/             # 启动初始化
│   │   └── index.ts
│   ├── controllers/           # 控制器层 (25+)
│   │   ├── auth.controller.ts
│   │   ├── project.controller.ts
│   │   ├── order.controller.ts
│   │   └── ...
│   ├── middleware/            # 中间件
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── middlewares/           # 额外中间件
│   ├── routes/                # 路由定义 (30+)
│   │   ├── auth.routes.ts
│   │   ├── project.routes.ts
│   │   └── ...
│   ├── services/              # 业务服务层 (16+)
│   │   ├── ai.service.ts      # AI 路由核心
│   │   ├── project.service.ts
│   │   ├── order.service.ts
│   │   └── ...
│   ├── types/                 # 类型定义
│   ├── utils/                 # 工具函数
│   └── validators/            # 请求验证
├── prisma/
│   ├── schema.prisma          # 数据模型定义
│   └── dev.db                 # SQLite 数据库文件
├── uploads/                   # 文件上传目录
├── .env                       # 环境配置
└── package.json
```

---

## 核心服务详解

### AI Service - 混合 AI 路由核心

**路径**: `src/services/ai.service.ts`

**职责**:
- 统一 AI 模型路由调度
- 4 层级 Prompt 合成
- 多提供商适配 (Gemini/GLM/DeepSeek/Volcengine)

**核心方法**:
```typescript
class AIService {
  // 路由选择
  async routeByTaskType(task: AITask): Promise<AIResult>;

  // Prompt 合成
  synthesizePrompt(L1: VisualGene, L2: Semantic, L3: Fusion, L4: Params): string;

  // 图像生成
  async generateImage(params: ImageGenParams): Promise<ImageResult>;

  // 文本生成
  async generateText(params: TextGenParams): Promise<TextResult>;
}
```

### Project Service - 项目管理核心

**路径**: `src/services/project.service.ts`

**职责**:
- 项目 CRUD 操作
- 版本快照管理
- 项目归档与恢复

### Order Service - 订单处理核心

**路径**: `src/services/order.service.ts`

**职责**:
- 订单创建与状态管理
- 支付流程处理
- 订单履约跟踪

---

## 路由结构

### API 路由表

| 路由前缀 | 控制器 | 描述 |
|---------|--------|------|
| `/api/auth` | auth.controller.ts | 认证相关 |
| `/api/users` | user.controller.ts | 用户管理 |
| `/api/projects` | project.controller.ts | 项目管理 |
| `/api/templates` | template.controller.ts | 模板管理 |
| `/api/orders` | order.controller.ts | 订单管理 |
| `/api/points` | point.controller.ts | 积分管理 |
| `/api/growth` | growth.controller.ts | 增长体系 |
| `/api/admin` | admin.controller.ts | 管理后台 |
| `/api/settings` | setting.controller.ts | 系统设置 |
| `/api/ai` | ai.controller.ts | AI 服务 |
| `/api/mineru` | mineru.routes.ts | 文档解析 |

---

## 数据模型

### 核心实体关系

```
User (1) ────< (N) Project
User (1) ────< (N) Order
User (1) ────< (1) PointAccount
User (N) ────< (N) Role
Project (1) ───< (N) Snapshot
Template (1) ──< (N) StyleDefinition
```

### 主要模型

- **User** - 用户基础信息
- **Project** - PPT 项目数据
- **Order** - 订单信息
- **PointAccount** - 积分账户
- **Snapshot** - 项目版本快照
- **Template** - 模板定义
- **Role/Permission** - 权限控制

---

## 环境配置

### .env 配置文件

```env
# 服务端口
PORT=1111

# 数据库
DATABASE_URL="file:./dev.db"

# JWT 密钥
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# AI 提供商配置
AI_PROVIDER="Volcengine"
COMBO_TEXT_MODEL="gemini-3-flash"
COMBO_IMAGE_MODEL="gemini-3-pro-image"
COMBO_VISION_MODEL="gemini-3-flash"

# 文档解析
DOC_PARSER_BASE="https://mineru.net"
DOC_PARSER_PROVIDER="MinerU"

# 存储配置
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"  # 10MB

# 邮件服务 (可选)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""

# 支付配置 (可选)
PAYMENT_PROVIDER=""
PAYMENT_KEY=""
PAYMENT_SECRET=""
```

---

## 开发指南

### 启动开发服务器

```bash
# 进入 server 目录
cd server

# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

### 数据库操作

```bash
# 生成 Prisma 客户端
npx prisma generate

# 数据库迁移
npx prisma migrate dev --name [migration-name]

# 查看数据库
npx prisma studio

# 重置数据库
npx prisma migrate reset
```

### 调试技巧

1. **启用详细日志**: 设置 `LOG_LEVEL=debug`
2. **API 测试**: 使用 `api_test.py` 或 Postman
3. **数据库检查**: 使用 `npx prisma studio`
4. **错误追踪**: 查看 `logs/error.log`

---

## 面包屑导航

**当前位置**: 根目录 > [server/](../CLAUDE.md)

**上级模块**:
- [src/](../../src/CLAUDE.md) - 前端主模块

**子模块**:
- [src/controllers/](./src/controllers/CLAUDE.md) - 控制器层
- [src/services/](./src/services/CLAUDE.md) - 服务层
- [prisma/](./prisma/CLAUDE.md) - 数据库模型

---

*最后更新: 2026-02-02*
