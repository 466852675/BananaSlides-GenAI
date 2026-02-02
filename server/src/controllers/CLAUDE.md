# 🎮 src/controllers - 控制器层

[< 返回 server 模块](../../CLAUDE.md) | [< 返回根目录](../../../../CLAUDE.md)

---

## 概述

控制器层负责接收 HTTP 请求、调用业务服务、返回响应。遵循 **单一职责原则**，每个控制器专注于一个资源领域。

### 核心职责

- 请求参数解析与验证
- 调用 Service 层执行业务逻辑
- 响应数据格式化
- 错误处理与转换

---

## 控制器列表

| 控制器 | 文件 | 职责 |
|--------|------|------|
| AuthController | `auth.controller.ts` | 登录/注册/登出/Token刷新 |
| UserController | `user.controller.ts` | 用户CRUD/密码管理 |
| ProjectController | `project.controller.ts` | 项目管理/版本控制 |
| TemplateController | `template.controller.ts` | 模板库管理 |
| OrderController | `order.controller.ts` | 订单创建/支付/退款 |
| PointController | `point.controller.ts` | 积分查询/消费/充值 |
| GrowthController | `growth.controller.ts` | 签到/邀请/任务 |
| AdminController | `admin.controller.ts` | 后台管理/数据统计 |
| SettingController | `setting.controller.ts` | 系统配置/环境变量 |
| AIController | `ai.controller.ts` | AI服务/图像生成 |
| LeadController | `lead.controller.ts` | 销售线索管理 |

---

## 控制器模板

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../utils/errors';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * 获取用户列表
   * GET /api/users
   */
  getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. 解析请求参数
      const { page = 1, limit = 10, search } = req.query;

      // 2. 调用 Service 层
      const result = await this.userService.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });

      // 3. 返回响应
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      // 4. 错误处理
      next(error);
    }
  };

  /**
   * 获取用户详情
   * GET /api/users/:id
   */
  getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 创建用户
   * POST /api/users
   */
  createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userData = req.body;
      const newUser = await this.userService.create(userData);

      res.status(201).json({
        success: true,
        data: newUser,
        message: '用户创建成功',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新用户
   * PUT /api/users/:id
   */
  updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedUser = await this.userService.update(id, updateData);

      res.json({
        success: true,
        data: updatedUser,
        message: '用户更新成功',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除用户
   * DELETE /api/users/:id
   */
  deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.userService.delete(id);

      res.json({
        success: true,
        message: '用户删除成功',
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

## 路由注册顺序

**重要**: 路由注册顺序影响中间件执行顺序。

```typescript
// app.ts 路由注册顺序
app.use('/api/auth', authRoutes);      // 1. 认证路由 (公开)
app.use('/api/public', publicRoutes);  // 2. 公开路由

// 3. 认证中间件 (之后的所有路由都需要认证)
app.use(authMiddleware);

app.use('/api/users', userRoutes);         // 4. 用户路由
app.use('/api/projects', projectRoutes);   // 5. 项目路由
app.use('/api/orders', orderRoutes);       // 6. 订单路由
app.use('/api/admin', adminRoutes);        // 7. 管理路由
```

---

## 面包屑导航

**当前位置**: 根目录 > [server/](../../CLAUDE.md) > [src/](../CLAUDE.md) > **controllers/**

**同级模块**:
- [services/](../services/CLAUDE.md) - 业务服务层
- [routes/](../routes/CLAUDE.md) - 路由定义
- [middleware/](../middleware/CLAUDE.md) - 中间件

---

*最后更新: 2026-02-02*
