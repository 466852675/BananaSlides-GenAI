# 06_API架构设计

> 本文档描述 YH-AI PPT 系统的 API 架构设计，涵盖 API 分层、路由结构、接口规范及安全策略。
>
> **技术栈**: Express 5.2 + Zod | **基础路径**: `/api` | **端口**: 1111

---

## 1. API 架构概览

### 1.1 设计原则

- **RESTful 风格**: 遵循 REST 设计规范，使用标准 HTTP 方法
- **路径规范化**: 资源路径使用名词复数形式 (`/projects`, `/orders`)
- **版本管理**: URL 中包含版本标识 (`/api/v1/...`)
- **统一响应格式**: 标准化成功/错误响应结构

### 1.2 API 分层结构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (React)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      接入层 (Nginx/Vite Proxy)                  │
│                   /api → http://127.0.0.1:1111                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express API Server                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   中间件层                                │  │
│  │  - CORS | Rate Limit | Auth | Logger | Error Handler    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────┴────────────────────────────┐   │
│  │                      路由层                               │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ auth    │ │ project │ │   ai    │ │  order  │       │   │
│  │  │ 路由    │ │  路由   │ │  路由   │ │  路由   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │refund   │ │ points  │ │product  │ │template │       │   │
│  │  │ 路由    │ │  路由   │ │  路由   │ │  路由   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据层 (Prisma ORM)                         │
│                    SQLite Database                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. API 路由清单

系统共有 **19 个 API 路由模块**：

### 2.1 路由总览表

| 序号 | 路由模块 | 文件路径 | 前缀 | 功能说明 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **认证路由** | `auth.routes.ts` | `/auth` | 登录/注册/登出/验证码 |
| 2 | **项目路由** | `project.routes.ts` | `/projects` | 项目 CRUD/状态管理 |
| 3 | **AI 路由** | `ai.routes.ts` | `/ai` | 大纲生成/内容生成/图片生成 |
| 4 | **订单路由** | `order.routes.ts` | `/orders` | 订单创建/支付/查询 |
| 5 | **退款路由** | `refund.routes.ts` | `/refunds` | 退款申请/审核/处理 |
| 6 | **积分路由** | `points.routes.ts` | `/points` | 积分查询/规则/交易 |
| 7 | **产品路由** | `product.routes.ts` | `/products` | 产品/套餐管理 |
| 8 | **模板路由** | `template.routes.ts` | `/templates` | 样式模板库 |
| 9 | **收藏路由** | `favorite.routes.ts` | `/favorites` | 收藏管理 |
| 10 | **快照路由** | `snapshot.routes.ts` | `/snapshots` | 项目版本快照 |
| 11 | **消息路由** | `message.routes.ts` | `/messages` | 站内信管理 |
| 12 | **通知路由** | `notification.routes.ts` | `/notifications` | 推送通知 |
| 13 | **线索路由** | `lead.routes.ts` | `/leads` | CRM 线索管理 |
| 14 | **增长路由** | `growth.routes.ts` | `/growth` | 签到/邀请/活动 |
| 15 | **Webhook 路由** | `webhook.routes.ts` | `/webhooks` | 第三方回调 |
| 16 | **MinerU 路由** | `mineru.routes.ts` | `/mineru` | 文档解析服务 |
| 17 | **上传路由** | `upload.routes.ts` | `/uploads` | 文件上传/管理 |
| 18 | **设置路由** | `setting.routes.ts` | `/settings` | 系统配置 |
| 19 | **管理路由** | `admin.routes.ts` | `/admin` | 后台管理 |

---

## 3. 核心 API 详解

### 3.1 认证模块 (Auth)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| POST | `/api/auth/logout` | 登出 | 是 |
| POST | `/api/auth/refresh-token` | 刷新 Token | 是 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |
| POST | `/api/auth/send-code` | 发送验证码 | 否 |
| POST | `/api/auth/reset-password` | 重置密码 | 否 |

**关键特性**:
- JWT Token 认证
- 密码 bcrypt 加密
- 登录失败锁定机制

### 3.2 项目模块 (Project)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| GET | `/api/projects` | 获取项目列表 | 是 |
| POST | `/api/projects` | 创建项目 | 是 |
| GET | `/api/projects/:id` | 获取项目详情 | 是 |
| PUT | `/api/projects/:id` | 更新项目 | 是 |
| DELETE | `/api/projects/:id` | 删除项目 | 是 |
| PUT | `/api/projects/:id/pin` | 置顶项目 | 是 |
| PUT | `/api/projects/:id/status` | 更新项目状态 | 是 |

### 3.3 AI 生成模块 (AI)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| POST | `/api/ai/outline` | 生成大纲 | 是 |
| POST | `/api/ai/content` | 生成内容 | 是 |
| POST | `/api/ai/image` | 生成图片 | 是 |
| POST | `/api/ai/parse-document` | 解析文档 | 是 |
| GET | `/api/ai/engines` | 获取引擎列表 | 是 |
| PUT | `/api/ai/engines/:id` | 更新引擎配置 | 是 |

### 3.4 商业模块 (Commerce)

#### 订单 (Order)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| GET | `/api/orders` | 订单列表 | 是 |
| POST | `/api/orders` | 创建订单 | 是 |
| GET | `/api/orders/:id` | 订单详情 | 是 |
| POST | `/api/orders/:id/pay` | 支付订单 | 是 |
| POST | `/api/orders/:id/cancel` | 取消订单 | 是 |

#### 退款 (Refund)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| POST | `/api/refunds` | 申请退款 | 是 |
| GET | `/api/refunds` | 退款列表 | 是 |
| GET | `/api/refunds/:id` | 退款详情 | 是 |
| POST | `/api/refunds/:id/approve` | 审核通过 | 是 |
| POST | `/api/refunds/:id/reject` | 审核拒绝 | 是 |

#### 积分 (Points)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| GET | `/api/points/balance` | 查询余额 | 是 |
| GET | `/api/points/rules` | 积分规则 | 是 |
| GET | `/api/points/transactions` | 交易记录 | 是 |
| POST | `/api/points/check-in` | 签到 | 是 |

#### 产品 (Product)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| GET | `/api/products` | 产品列表 | 是 |
| GET | `/api/products/:id` | 产品详情 | 是 |

### 3.5 管理模块 (Admin)

| 方法 | 路径 | 说明 | 认证 |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/users` | 用户管理 | 是 |
| PUT | `/api/admin/users/:id/role` | 修改角色 | 是 |
| PUT | `/api/admin/users/:id/status` | 修改状态 | 是 |
| GET | `/api/admin/orders` | 订单管理 | 是 |
| GET | `/api/admin/refunds` | 退款管理 | 是 |
| POST | `/api/admin/points/rules` | 创建积分规则 | 是 |
| GET | `/api/admin/audit-logs` | 审计日志 | 是 |

---

## 4. 请求/响应规范

### 4.1 通用请求头

| 头名称 | 说明 | 示例 |
| :--- | :--- | :--- |
| Authorization | JWT Token | `Bearer eyJhbGciOiJIUzI1NiIs...` |
| Content-Type | 请求类型 | `application/json` |
| Accept | 响应类型 | `application/json` |

### 4.2 通用响应格式

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Example"
  },
  "message": "操作成功"
}
```

**错误响应 (4xx/5xx)**:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "用户名或密码错误"
  }
}
```

### 4.3 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 5. 安全策略

### 5.1 认证与授权

| 策略 | 说明 |
| :--- | :--- |
| **JWT Token** | 访问令牌，有效期 7 天 |
| **Refresh Token** | 刷新令牌，有效期 30 天 |
| **RBAC** | 基于角色的权限控制 |
| **接口权限** | 敏感接口需 ADMIN 角色 |

### 5.2 请求限流

| 场景 | 限制 |
| :--- | :--- |
| 全局 | 100 次/15 分钟 |
| 登录 | 5 次/15 分钟 |
| AI 生成 | 10 次/分钟 |
| 文件上传 | 20 次/小时 |

### 5.3 数据校验

- **Zod Schema**: 请求参数自动校验
- **必填字段**: 统一错误提示
- **格式验证**: 邮箱、手机号、UUID 等

---

## 6. 错误码规范

### 6.1 错误码结构

```
{AUTH|PROJECT|ORDER|REFUND|POINTS|AI|SYSTEM}_{三位序号}
```

### 6.2 常见错误码

| 错误码 | 说明 |
| :--- | :--- |
| AUTH_001 | 用户名或密码错误 |
| AUTH_002 | Token 已过期 |
| AUTH_003 | 无访问权限 |
| PROJECT_001 | 项目不存在 |
| PROJECT_002 | 无权访问该项目 |
| ORDER_001 | 订单不存在 |
| ORDER_002 | 订单状态异常 |
| REFUND_001 | 退款申请已存在 |
| POINTS_001 | 积分不足 |
| AI_001 | AI 服务异常 |
| SYSTEM_001 | 服务器内部错误 |

---

## 7. 版本历史

| 版本 | 日期 | 修改内容 |
| :--- | :--- | :--- |
| v1.0 | 2026-02-12 | 初始版本，19个API模块 |
