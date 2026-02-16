# VIP会员体系

## 概述

VIP会员体系是 YH-AI PPT **商业化核心模块**，通过6级分层制度为用户提供差异化服务和专属权益。系统与积分系统深度集成，实现**权益自动发放**和**到期自动回收**机制。

## 核心功能特性

| 功能特性 | 说明 | 实现位置 |
|---------|------|---------|
| 6级VIP等级 | 从普通用户到Diamond的阶梯体系 | `User.vipLevel` |
| 权益差异化 | 项目配额、积分折扣、客服等级 | 多系统集成 |
| 自动发放 | 支付成功后自动开通VIP | `order.service.ts` |
| 到期处理 | VIP到期自动降级，权益回收 | 定时任务 |
| 续费叠加 | 支持时长累加，续费更优惠 | `order.service.ts` |
| 永久VIP | 管理员角色不受时间限制 | `getActionCost()` |

---

## 数据库模型

### 1. 用户VIP字段 (User Model)

```prisma
model User {
  id            String    @id @default(uuid())
  
  // VIP核心字段
  vipLevel      Int       @default(0)      // VIP等级: 0-5
  vipExpiresAt  DateTime?                  // VIP过期时间
  
  // 权益相关字段
  points        Int       @default(30)     // 当前积分
  pointsUsed    Int       @default(0)      // 累计使用积分
  
  // 权限控制
  role          UserRole  @default(USER)   // ADMIN/SUPER_ADMIN为永久VIP
  
  // 关联数据
  orders        Order[]                    // 购买记录
  transactions  Transaction[]             // 积分交易
}

enum UserRole {
  USER           // 普通用户
  BASIC          // 基础角色
  PROFESSIONAL   // 专业角色
  PREMIUM        // 高级角色
  ENTERPRISE     // 企业角色
  ADMIN          // 管理员(永久VIP)
  SUPER_ADMIN    // 超级管理员(永久VIP)
}
```

### 2. VIP商品 (Product Model)

```prisma
model Product {
  id            String    @id @default(uuid())
  
  // 商品类型: 'points' | 'vip' | 'combo'
  type          String
  name          String                    // 商品名称
  originalPrice Float?                    // 原价
  price         Float                     // 售价
  points        Int                       // 赠送积分
  
  // VIP专属字段
  roleToGrant   String?                   // 授予的角色: BASIC/PREMIUM/ENTERPRISE
  period        String    @default("once") // 有效期: 'once' | 'monthly' | 'yearly'
  
  // 商品配置
  tags          String?                   // 标签 (JSON)
  features      String?                   // 权益说明 (JSON)
  desc          String?                   // 商品描述
  discountEnd   DateTime?                 // 折扣结束时间
  
  // 状态控制
  isActive      Boolean   @default(true)
  displayType   String    @default("public") // 展示类型
  sortOrder     Int       @default(0)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### 3. 订单与VIP关联 (Order Model)

```prisma
model Order {
  id            String      @id @default(uuid())
  orderNo       String      @unique        // 订单编号
  userId        String
  
  // 商品信息
  productType   String                      // 'vip' | 'points'
  productName   String
  finalPrice    Float
  
  // VIP变更记录
  beforeVipLevel Int?                       // 购买前VIP等级
  afterVipLevel  Int?                       // 购买后VIP等级
  
  // 订单状态
  status        OrderStatus @default(PENDING)
  paidAt        DateTime?
  
  user          User        @relation(fields: [userId], references: [id])
}

enum OrderStatus {
  PENDING   // 待支付
  PAID      // 已支付
  CANCELLED // 已取消
  REFUNDED  // 已退款
  FAILED    // 支付失败
}
```

---

## VIP等级与权益

### 1. 等级体系

| 等级 | 名称 | 角色标识 | 月度价格 | 主要权益 |
|------|------|---------|---------|---------|
| 0 | 普通用户 | USER | - | 基础功能，10个项目额度 |
| 1 | Bronze | BASIC | ¥9.9 | 30个项目，积分9折 |
| 2 | Silver | PROFESSIONAL | ¥29.9 | 无限项目，积分8折，优先客服 |
| 3 | Gold | PREMIUM | ¥59.9 | 无限项目，积分7折，专属客服 |
| 4 | Platinum | ENTERPRISE | ¥99.9 | 无限项目，积分6折，1对1顾问 |
| 5 | Diamond | - | ¥199.9 | 无限项目，积分5折，定制服务 |

### 2. 权益详解

#### 2.1 项目配额

```typescript
const PROJECT_QUOTAS = {
  0: 10,    // 普通用户: 10个项目
  1: 30,    // Bronze: 30个项目
  2: 50,    // Silver: 50个项目
  3: Infinity, // Gold+: 无限项目
  4: Infinity,
  5: Infinity
};

// 检查项目配额
async function checkProjectQuota(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipLevel: true, vipExpiresAt: true, role: true }
  });
  
  const currentVipLevel = getEffectiveVipLevel(user);
  const quota = PROJECT_QUOTAS[currentVipLevel];
  
  if (quota === Infinity) return true;
  
  const currentProjects = await prisma.project.count({
    where: { userId, status: { not: 'deleted' } }
  });
  
  return currentProjects < quota;
}
```

#### 2.2 积分折扣

```typescript
// VIP等级对应积分折扣
const VIP_DISCOUNTS = {
  0: 1.0,   // 普通用户: 无折扣
  1: 0.9,   // Bronze: 9折
  2: 0.8,   // Silver: 8折
  3: 0.7,   // Gold: 7折
  4: 0.6,   // Platinum: 6折
  5: 0.5    // Diamond: 5折
};

// 在 points.service.ts 中应用折扣
export async function getActionCost(
  actionCode: PointsActionCode, 
  userId?: string
): Promise<number> {
  const rule = await prisma.pointsRule.findUnique({
    where: { code: actionCode },
  });

  if (!userId || !rule) return rule?.costPoints || 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipLevel: true, vipExpiresAt: true, role: true }
  });

  // 检查VIP是否有效
  if (isVipValid(user)) {
    // 使用VIP价格
    if (rule.vipCostPoints !== null && rule.vipCostPoints !== undefined) {
      return rule.vipCostPoints;
    }
    // 或使用折扣计算
    const discount = VIP_DISCOUNTS[user.vipLevel] || 1.0;
    return Math.ceil(rule.costPoints * discount);
  }

  return rule.costPoints;
}
```

#### 2.3 客服支持等级

| 等级 | 客服渠道 | 响应时间 | 支持内容 |
|------|---------|---------|---------|
| 0 | 帮助文档 | - | 自助查询 |
| 1-2 | 邮件支持 | 24小时内 | 技术咨询 |
| 3-4 | 在线客服 | 4小时内 | 优先处理 |
| 5 | 专属顾问 | 1小时内 | 1对1服务 |

---

## VIP开通流程

### 1. 购买流程

```
用户选择VIP商品
    ↓
创建订单 (POST /orders)
    ↓
支付订单 (POST /orders/:id/pay) [Mock/真实支付]
    ↓
支付成功回调
    ↓
发放VIP权益
    ↓
更新用户vipLevel和vipExpiresAt
    ↓
创建积分充值记录(赠送积分)
    ↓
发送消息通知用户
```

### 2. 权益发放实现

```typescript
// server/src/services/order.service.ts

async function fulfillOrder(order: Order): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: order.productId }
  });

  if (!product) throw new Error('商品不存在');

  const user = await prisma.user.findUnique({
    where: { id: order.userId }
  });

  // 记录购买前VIP等级
  const beforeVipLevel = user.vipLevel;

  // 1. 发放VIP权益
  if (product.type === 'vip' && product.roleToGrant) {
    const newVipLevel = ROLE_TO_LEVEL_MAP[product.roleToGrant];
    const durationDays = PERIOD_TO_DAYS[product.period];
    
    // 计算新的过期时间
    let newExpiresAt: Date;
    if (user.vipExpiresAt && user.vipExpiresAt > new Date()) {
      // 续费：在原有基础上叠加
      newExpiresAt = new Date(user.vipExpiresAt);
      newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);
    } else {
      // 新购或已过期
      newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);
    }

    await prisma.user.update({
      where: { id: order.userId },
      data: {
        vipLevel: Math.max(user.vipLevel, newVipLevel), // 等级只升不降
        vipExpiresAt: newExpiresAt,
        role: product.roleToGrant as UserRole
      }
    });

    // 记录购买后VIP等级
    await prisma.order.update({
      where: { id: order.id },
      data: {
        beforeVipLevel,
        afterVipLevel: newVipLevel
      }
    });
  }

  // 2. 发放赠送积分
  if (product.points > 0) {
    await addPoints(
      order.userId,
      product.points,
      'reward',
      `购买${product.name}赠送积分`,
      'SYSTEM',
      order.id
    );
  }

  // 3. 发送通知
  await createMessage({
    userId: order.userId,
    type: 'VIP',
    title: 'VIP开通成功',
    content: `恭喜您成为${product.name}会员，享受专属权益！`,
    bizType: 'order',
    bizId: order.id
  });
}

// 角色到等级的映射
const ROLE_TO_LEVEL_MAP = {
  'BASIC': 1,
  'PROFESSIONAL': 2,
  'PREMIUM': 3,
  'ENTERPRISE': 4
};

// 周期到天数的映射
const PERIOD_TO_DAYS = {
  'once': 30,      // 一次性：30天
  'monthly': 30,   // 月卡：30天
  'yearly': 365    // 年卡：365天
};
```

---

## VIP到期处理

### 1. 自动降级机制

```typescript
// 定时任务：每天检查过期VIP
async function processExpiredVip(): Promise<void> {
  const now = new Date();
  
  // 找出已过期的VIP用户（非管理员）
  const expiredUsers = await prisma.user.findMany({
    where: {
      vipLevel: { gt: 0 },
      vipExpiresAt: { lt: now },
      role: { notIn: ['ADMIN', 'SUPER_ADMIN'] }
    }
  });

  for (const user of expiredUsers) {
    // 降级为普通用户
    await prisma.user.update({
      where: { id: user.id },
      data: {
        vipLevel: 0,
        role: 'USER'
      }
    });

    // 发送到期提醒
    await createMessage({
      userId: user.id,
      type: 'VIP',
      title: 'VIP已到期',
      content: '您的VIP会员已到期，如需继续使用权益请续费。',
      actionUrl: '/pricing'
    });

    console.log(`[VIP] 用户 ${user.id} VIP已到期，已降级为普通用户`);
  }
}

// 使用 node-cron 每天凌晨执行
cron.schedule('0 0 * * *', processExpiredVip);
```

### 2. 到期前提醒

```typescript
// 提前7天和1天发送提醒
async function sendVipExpirationReminder(): Promise<void> {
  const now = new Date();
  
  // 7天后过期的用户
  const remind7Days = new Date(now);
  remind7Days.setDate(remind7Days.getDate() + 7);
  
  const users7Days = await prisma.user.findMany({
    where: {
      vipLevel: { gt: 0 },
      vipExpiresAt: {
        gte: new Date(remind7Days.setHours(0, 0, 0, 0)),
        lt: new Date(remind7Days.setHours(23, 59, 59, 999))
      }
    }
  });

  for (const user of users7Days) {
    await createMessage({
      userId: user.id,
      type: 'VIP',
      title: 'VIP即将到期',
      content: '您的VIP会员将在7天后到期，请及时续费以保持权益。',
      actionUrl: '/pricing'
    });
  }
}
```

---

## API 接口

### 1. 获取VIP商品列表

**Endpoint:** `GET /api/products?type=vip`

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: string;
    name: string;
    originalPrice: number;
    price: number;
    points: number;
    period: string;
    features: string[];
    desc: string;
  }>;
}
```

### 2. 创建VIP订单

**Endpoint:** `POST /api/orders`

**Request Body:**
```typescript
{
  productId: string;      // VIP商品ID
  paymentMethod: string;  // 'alipay' | 'wechat'
}
```

### 3. 查询VIP状态

**Endpoint:** `GET /api/user/vip-status`

**Response:**
```typescript
{
  success: true;
  data: {
    vipLevel: number;
    vipName: string;
    vipExpiresAt: string | null;
    isPermanent: boolean;
    discount: number;       // 当前积分折扣
    projectQuota: number;   // 项目配额
  }
}
```

---

## 前端展示

### 1. VIP等级徽章组件

```typescript
// src/components/VipBadge.tsx

import React from 'react';

interface VipBadgeProps {
  level: number;
  expiresAt?: string;
}

const VIP_NAMES = {
  0: '普通用户',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond'
};

const VIP_COLORS = {
  0: 'gray',
  1: '#CD7F32',
  2: '#C0C0C0',
  3: '#FFD700',
  4: '#E5E4E2',
  5: '#B9F2FF'
};

export const VipBadge: React.FC<VipBadgeProps> = ({ level, expiresAt }) => {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  
  return (
    <span 
      className="vip-badge"
      style={{ 
        backgroundColor: VIP_COLORS[level],
        opacity: isExpired ? 0.5 : 1
      }}
    >
      {VIP_NAMES[level]}
      {isExpired && '(已过期)'}
    </span>
  );
};
```

### 2. VIP权益对比页面

```typescript
// src/pages/Pricing.tsx

const VIP_LEVELS = [
  {
    level: 0,
    name: '普通用户',
    price: 0,
    features: ['10个项目', '基础模板', '标准积分价格']
  },
  {
    level: 1,
    name: 'Bronze',
    price: 9.9,
    features: ['30个项目', '全部模板', '积分9折', '邮件客服']
  },
  {
    level: 2,
    name: 'Silver',
    price: 29.9,
    features: ['无限项目', '全部模板', '积分8折', '优先客服']
  }
  // ... 更多等级
];
```

---

## 扩展阅读

- [积分系统](./积分系统.md) - VIP积分折扣实现
- [订单管理](../08_订单管理/订单管理系统.md) - VIP购买流程
- [商品管理](../09_商品管理/产品管理系统.md) - VIP商品配置

---

## 变更历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-02-16 | 基于代码实现重写，添加完整权益体系 |
| v1.1 | - | 添加自动到期降级机制 |
| v1.2 | - | 添加续费叠加逻辑 |

---

**维护者:** YH-AI PPT 技术团队  
**最后更新:** 2026-02-16
