# 🔧 src/services - 业务服务层

[< 返回 server 模块](../../CLAUDE.md) | [< 返回根目录](../../../../CLAUDE.md)

---

## 概述

业务逻辑核心层，实现所有领域业务逻辑。采用 **Service Layer Pattern**，控制器通过服务层访问数据，禁止直接调用 Prisma。

### 核心服务清单

| 服务 | 文件 | 职责 |
|------|------|------|
| AI Service | `ai.service.ts` | 混合 AI 路由与 Prompt 合成 |
| Project Service | `project.service.ts` | 项目全生命周期管理 |
| Order Service | `order.service.ts` | 订单与支付流程 |
| User Service | `user.service.ts` | 用户管理 |
| Point Service | `point.service.ts` | 积分账户系统 |
| Snapshot Service | `snapshot.service.ts` | 版本快照管理 |
| Template Service | `template.service.ts` | 模板库管理 |
| Setting Service | `setting.service.ts` | 系统配置热更新 |
| Growth Service | `growth.service.ts` | 增长体系 (签到/邀请) |
| Permission Service | `permission.service.ts` | RBAC 权限控制 |
| Lead Service | `lead.service.ts` | 销售线索管理 |

---

## 架构模式

### Service Layer 调用链

```
Controller -> Service -> Prisma -> SQLite
     |
     v
   Service -> 其他 Service / 外部 API
```

### 服务类模板

```typescript
// 1. 定义接口
export interface IUserService {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}

// 2. 实现类
export class UserService implements IUserService {
  // 依赖注入 Prisma
  constructor(private prisma: PrismaClient) {}

  // 实现方法
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: CreateUserInput): Promise<User> {
    // 业务验证
    await this.validateCreate(data);

    // 创建用户
    return this.prisma.user.create({ data });
  }

  // ... 其他方法

  // 私有辅助方法
  private async validateCreate(data: CreateUserInput): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) {
      throw new Error('用户邮箱已存在');
    }
  }
}

// 3. 导出单例
export const userService = new UserService(prisma);
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
  // 按任务类型路由
  async routeByTaskType(task: AITask): Promise<AIResult>;

  // 4 层 Prompt 合成
  synthesizePrompt(
    L1: VisualGene,      // 视觉基因层
    L2: Semantic,       // 业务语义层
    L3: Fusion,         // 指令融合层
    L4: Params          // 技术参数层
  ): string;

  // 图像生成
  async generateImage(params: ImageGenParams): Promise<ImageResult>;

  // 文本生成
  async generateText(params: TextGenParams): Promise<TextResult>;

  // 视觉分析
  async analyzeImage(image: Buffer): Promise<VisionResult>;
}
```

### Project Service - 项目管理核心

**路径**: `src/services/project.service.ts`

**职责**:
- 项目 CRUD 操作
- 版本快照管理
- 项目归档与恢复

**核心方法**:
```typescript
class ProjectService {
  // 创建项目
  async create(data: CreateProjectInput, userId: string): Promise<Project>;

  // 查询项目
  async findById(id: string): Promise<Project | null>;
  async findByUser(userId: string, options: QueryOptions): Promise<Project[]>;

  // 更新项目
  async update(id: string, data: UpdateProjectInput): Promise<Project>;

  // 删除/归档
  async softDelete(id: string): Promise<void>;
  async archive(id: string): Promise<void>;
  async restore(id: string): Promise<void>;

  // 快照管理
  async createSnapshot(projectId: string): Promise<Snapshot>;
  async listSnapshots(projectId: string): Promise<Snapshot[]>;
  async rollbackToSnapshot(projectId: string, snapshotId: string): Promise<Project>;
}
```

### Order Service - 订单处理核心

**路径**: `src/services/order.service.ts`

**职责**:
- 订单创建与状态管理
- 支付流程处理
- 订单履约跟踪

### User Service - 用户管理核心

**路径**: `src/services/user.service.ts`

**职责**:
- 用户 CRUD
- 密码管理
- 用户状态管理

### Point Service - 积分系统核心

**路径**: `src/services/point.service.ts`

**职责**:
- 积分账户管理
- 积分消耗/充值
- 积分流水记录

### Snapshot Service - 版本快照核心

**路径**: `src/services/snapshot.service.ts`

**职责**:
- 项目快照创建
- 版本历史管理
- 时光机回滚

### Template Service - 模板管理核心

**路径**: `src/services/template.service.ts`

**职责**:
- 模板库管理
- 样式定义管理
- 模板分类

### Setting Service - 系统配置核心

**路径**: `src/services/setting.service.ts`

**职责**:
- 系统参数管理
- 运行时配置热更新
- 环境变量读取

**特性**: 支持 `.env` 热重载

### Growth Service - 增长体系核心

**路径**: `src/services/growth.service.ts`

**职责**:
- 签到系统
- 邀请系统
- 任务系统

### Permission Service - 权限控制核心

**路径**: `src/services/permission.service.ts`

**职责**:
- RBAC 角色管理
- 权限点管理
- 权限验证

### Lead Service - 线索管理核心

**路径**: `src/services/lead.service.ts`

**职责**:
- 销售线索收集
- 线索分配
- 跟进记录

---

## 服务层编码规范

### 1. 依赖注入

```typescript
// 通过构造函数注入依赖
class MyService {
  constructor(
    private prisma: PrismaClient,
    private aiService: AIService,
    private pointService: PointService
  ) {}
}
```

### 2. 错误处理

```typescript
import { AppError } from '../utils/errors';

class UserService {
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('用户不存在', 404);
    }
    return user;
  }
}
```

### 3. 事务处理

```typescript
class OrderService {
  async createOrder(data: CreateOrderInput, userId: string): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // 1. 创建订单
      const order = await tx.order.create({ data: { ...data, userId } });

      // 2. 扣除积分
      await tx.pointAccount.update({
        where: { userId },
        data: { balance: { decrement: data.pointCost } },
      });

      // 3. 记录积分流水
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -data.pointCost,
          type: 'ORDER_PAYMENT',
          orderId: order.id,
        },
      });

      return order;
    });
  }
}
```

### 4. 类型定义

```typescript
// types.ts
export interface CreateProjectInput {
  name: string;
  description?: string;
  templateId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectFilters {
  userId?: string;
  status?: ProjectStatus;
  search?: string;
  page?: number;
  limit?: number;
}
```

---

## 面包屑导航

**当前位置**: 根目录 > [server/](../CLAUDE.md)

**同级模块**:
- [src/](../../src/CLAUDE.md) - 前端模块
- [docs/](../../docs/) - 技术文档

**子模块**:
- [src/services/](src/services/CLAUDE.md) - 业务服务层
- [src/controllers/](src/controllers/CLAUDE.md) - 控制器层
- [src/routes/](src/routes/CLAUDE.md) - 路由定义
- [prisma/](prisma/CLAUDE.md) - 数据库模型

---

*最后更新: 2026-02-02*
