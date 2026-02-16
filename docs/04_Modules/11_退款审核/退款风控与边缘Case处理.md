# 退款风控与边缘Case处理

## 概述

退款审核系统是 YH-AI PPT **商业化风控核心模块**，负责处理用户的退款申请，包含**7层风控规则**、**自动审批机制**和**权益回收**功能。系统通过用户行为分析识别异常退款模式，自动拦截高风险申请，同时对合规申请快速处理，平衡用户体验和资金安全。

## 核心功能特性

| 功能特性 | 说明 | 技术亮点 |
|---------|------|---------|
| 7项风控规则 | 时间/次数/金额/频率/行为/账户/IP多维度风控 | 综合评分模型 |
| 自动审批 | 低风险订单自动通过 | 规则引擎 |
| 二审机制 | 高风险订单人工复核 | 工作流引擎 |
| 权益回收 | 退款后自动降级VIP/扣除积分 | 事务保证 |
| 批量处理 | 支持批量审核 | 效率优化 |
| 风控标记 | 异常用户自动标记 | 实时风控 |

---

## 数据库模型

### 1. 退款申请表 (RefundRequest)

```prisma
model RefundRequest {
  id                String       @id @default(uuid())
  refundNo          String       @unique        // 退款单号: REF-YYYYMMDD-XXXXXX
  
  // 关联信息
  orderId           String
  order             Order        @relation(fields: [orderId], references: [id])
  userId            String
  user              User         @relation(fields: [userId], references: [id])
  
  // 退款信息
  amount            Float                       // 退款金额
  reason            String                      // 退款原因
  description       String?                     // 详细说明
  remark            String?                     // 审核备注
  
  // 状态流转
  status            RefundStatus @default(PENDING)
  processedAt       DateTime?                   // 处理时间
  completedAt       DateTime?                   // 完成时间
  processedBy       String?                     // 处理人
  secondApprovedBy  String?                     // 二审人
  
  // 异常处理
  failReason        String?                     // 失败原因
  exceptionType     String?                     // 异常类型
  requireManualAt   DateTime?                   // 转人工时间
  
  // 退款交易信息
  transactionId     String?                     // 退款交易流水号
  
  // 时间戳
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  // 关联
  history           RefundHistory[]
  retryLogs         RefundRetryLog[]
  
  @@index([userId])
  @@index([orderId])
  @@index([status])
  @@index([createdAt])
}

enum RefundStatus {
  PENDING         // 待审核（风控中）
  PENDING_SECOND  // 待二审
  PROCESSING      // 处理中
  COMPLETED       // 已完成
  REJECTED        // 已拒绝
  FAILED          // 失败
  MANUAL_REQUIRED // 需人工处理
}
```

### 2. 退款历史记录 (RefundHistory)

```prisma
model RefundHistory {
  id        String   @id @default(uuid())
  refundId  String
  refund    RefundRequest @relation(fields: [refundId], references: [id], onDelete: Cascade)
  
  action    String   // SUBMIT, AUTO_APPROVE, APPROVE, REJECT, PROCESS, COMPLETE, FAIL
  operator  String   // 操作人: 'user', 'system' 或 管理员ID
  note      String?  // 审核备注或失败原因
  createdAt DateTime @default(now())
  
  @@index([refundId])
}
```

### 3. 用户退款统计 (UserRefundStats)

```prisma
model UserRefundStats {
  userId            String    @id
  user              User      @relation(fields: [userId], references: [id])
  
  totalRequests     Int       @default(0)       // 累计申请次数
  approvedCount     Int       @default(0)       // 通过次数
  rejectedCount     Int       @default(0)       // 拒绝次数
  lastRequestAt     DateTime?                   // 上次申请时间
  riskScore         Int       @default(0)       // 风险评分(0-100)
  
  @@index([riskScore])
}
```

---

## 退款流程

```
用户提交退款申请
    ↓
┌─────────────────┐
│   风控引擎评估   │
│  (7项规则检查)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
低风险      高风险
    │         │
    ▼         ▼
自动通过   人工二审
    │         │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
通过        拒绝
    │         │
    ▼         ▼
执行退款   通知用户
    │
    ▼
权益回收
    │
    ▼
通知用户
```

---

## 7层风控规则

### 1. 时间限制规则

```typescript
// 订单超过7天不允许退款
const TIME_LIMIT_DAYS = 7;

function checkTimeLimit(order: Order): boolean {
  const orderAge = Date.now() - order.createdAt.getTime();
  const days = orderAge / (1000 * 60 * 60 * 24);
  return days <= TIME_LIMIT_DAYS;
}
```

### 2. 退款次数限制

```typescript
// 30天内最多申请3次退款
const REFUND_LIMIT_WINDOW = 30;  // 天
const REFUND_LIMIT_COUNT = 3;

async function checkRefundFrequency(userId: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - REFUND_LIMIT_WINDOW);
  
  const count = await prisma.refundRequest.count({
    where: {
      userId,
      createdAt: { gte: windowStart }
    }
  });
  
  return count < REFUND_LIMIT_COUNT;
}
```

### 3. 退款金额限制

```typescript
// 单笔退款金额上限
const MAX_REFUND_AMOUNT = 1000;  // 元
// 累计退款金额上限
const MAX_TOTAL_REFUND_AMOUNT = 2000;  // 元

async function checkRefundAmount(
  userId: string,
  amount: number
): Promise<{ allowed: boolean; requiresSecondApproval?: boolean }> {
  // 单笔超限
  if (amount > MAX_REFUND_AMOUNT) {
    return { allowed: false };
  }
  
  // 检查累计金额
  const totalRefunded = await prisma.refundRequest.aggregate({
    where: {
      userId,
      status: { in: ['COMPLETED', 'PROCESSING'] }
    },
    _sum: { amount: true }
  });
  
  const newTotal = (totalRefunded._sum.amount || 0) + amount;
  
  if (newTotal > MAX_TOTAL_REFUND_AMOUNT) {
    return { allowed: true, requiresSecondApproval: true };
  }
  
  return { allowed: true };
}
```

### 4. 退款频率检测

```typescript
// 检测退款频率异常（短时间内多次申请）
async function checkRefundVelocity(userId: string): Promise<boolean> {
  const recentRefunds = await prisma.refundRequest.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // 7天内
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (recentRefunds.length < 2) return true;
  
  // 检查时间间隔
  for (let i = 0; i < recentRefunds.length - 1; i++) {
    const interval = recentRefunds[i].createdAt.getTime() - 
                     recentRefunds[i + 1].createdAt.getTime();
    
    // 如果间隔小于1小时，视为异常
    if (interval < 60 * 60 * 1000) {
      return false;
    }
  }
  
  return true;
}
```

### 5. 用户行为分析

```typescript
// 用户退款行为风险评分
async function calculateUserRiskScore(userId: string): Promise<number> {
  const stats = await prisma.userRefundStats.findUnique({
    where: { userId }
  });
  
  if (!stats) return 0;
  
  let score = 0;
  
  // 申请频率过高 +20
  if (stats.totalRequests > 5) score += 20;
  
  // 拒绝率过高 +30
  const rejectionRate = stats.totalRequests > 0 
    ? stats.rejectedCount / stats.totalRequests 
    : 0;
  if (rejectionRate > 0.5) score += 30;
  
  // 最近有退款申请 +10
  if (stats.lastRequestAt && 
      Date.now() - stats.lastRequestAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    score += 10;
  }
  
  return Math.min(score, 100);
}
```

### 6. 账户状态检查

```typescript
// 检查用户账户状态
async function checkAccountStatus(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, riskScore: true }
  });
  
  if (!user) {
    return { allowed: false, reason: '用户不存在' };
  }
  
  if (user.status === 'DISABLED') {
    return { allowed: false, reason: '账户已禁用' };
  }
  
  if (user.riskScore && user.riskScore > 80) {
    return { allowed: false, reason: '账户风险等级过高' };
  }
  
  return { allowed: true };
}
```

### 7. IP/设备异常检测

```typescript
// 检测可疑IP或设备
async function checkIpAndDevice(
  userId: string,
  ip: string,
  deviceId: string
): Promise<boolean> {
  // 检查该IP下是否有多个账户申请退款
  const ipBasedRequests = await prisma.refundRequest.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      order: {
        user: {
          lastLoginIp: ip
        }
      }
    }
  });
  
  // 同一IP下超过5个退款申请视为异常
  if (ipBasedRequests > 5) {
    return false;
  }
  
  return true;
}
```

---

## 风控引擎实现

```typescript
// server/src/services/refund.service.ts

interface RiskCheckResult {
  passed: boolean;
  score: number;           // 0-100，分数越高风险越大
  rules: Array<{
    rule: string;
    passed: boolean;
    message?: string;
  }>;
  requiresSecondApproval: boolean;
}

/**
 * 风控引擎主函数
 */
export async function riskAssessment(
  userId: string,
  order: Order,
  refundAmount: number,
  context: {
    ip: string;
    deviceId: string;
  }
): Promise<RiskCheckResult> {
  const rules: RiskCheckResult['rules'] = [];
  let totalScore = 0;
  let requiresSecondApproval = false;
  
  // 1. 时间限制检查
  const timeCheck = checkTimeLimit(order);
  rules.push({
    rule: '时间限制',
    passed: timeCheck,
    message: timeCheck ? undefined : '订单超过7天，不可退款'
  });
  if (!timeCheck) totalScore += 100;  // 直接高风险
  
  // 2. 退款次数检查
  const frequencyCheck = await checkRefundFrequency(userId);
  rules.push({
    rule: '退款次数',
    passed: frequencyCheck,
    message: frequencyCheck ? undefined : '30天内退款次数已达上限'
  });
  if (!frequencyCheck) totalScore += 30;
  
  // 3. 金额限制检查
  const amountCheck = await checkRefundAmount(userId, refundAmount);
  rules.push({
    rule: '金额限制',
    passed: amountCheck.allowed,
    message: amountCheck.allowed ? undefined : '退款金额超限'
  });
  if (amountCheck.requiresSecondApproval) {
    requiresSecondApproval = true;
  }
  if (!amountCheck.allowed) totalScore += 50;
  
  // 4. 退款频率检查
  const velocityCheck = await checkRefundVelocity(userId);
  rules.push({
    rule: '退款频率',
    passed: velocityCheck,
    message: velocityCheck ? undefined : '退款频率异常'
  });
  if (!velocityCheck) totalScore += 40;
  
  // 5. 用户风险评分
  const riskScore = await calculateUserRiskScore(userId);
  rules.push({
    rule: '用户风险评分',
    passed: riskScore < 60,
    message: `风险评分: ${riskScore}`
  });
  totalScore += riskScore * 0.3;
  
  // 6. 账户状态检查
  const accountCheck = await checkAccountStatus(userId);
  rules.push({
    rule: '账户状态',
    passed: accountCheck.allowed,
    message: accountCheck.reason
  });
  if (!accountCheck.allowed) totalScore += 100;
  
  // 7. IP/设备检查
  const ipCheck = await checkIpAndDevice(userId, context.ip, context.deviceId);
  rules.push({
    rule: 'IP/设备',
    passed: ipCheck,
    message: ipCheck ? undefined : 'IP或设备异常'
  });
  if (!ipCheck) totalScore += 20;
  
  // 综合评估
  const passed = totalScore < 60 && rules.every(r => r.passed);
  
  // 分数60-80需要二审
  if (totalScore >= 60 && totalScore < 80) {
    requiresSecondApproval = true;
  }
  
  return {
    passed,
    score: Math.min(Math.round(totalScore), 100),
    rules,
    requiresSecondApproval
  };
}
```

---

## 自动审批与人工审核

### 1. 自动审批逻辑

```typescript
export async function processRefundRequest(
  requestId: string
): Promise<void> {
  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    include: { order: true, user: true }
  });
  
  if (!request) throw new Error('退款申请不存在');
  
  // 执行风控评估
  const riskResult = await riskAssessment(
    request.userId,
    request.order,
    request.amount,
    { ip: request.user.lastLoginIp || '', deviceId: '' }
  );
  
  // 更新风险评分
  await prisma.userRefundStats.upsert({
    where: { userId: request.userId },
    create: {
      userId: request.userId,
      riskScore: riskResult.score
    },
    update: {
      riskScore: riskResult.score,
      totalRequests: { increment: 1 }
    }
  });
  
  if (!riskResult.passed) {
    // 风控不通过，自动拒绝
    await autoReject(requestId, '风控评估不通过', riskResult);
  } else if (riskResult.requiresSecondApproval) {
    // 需要二审
    await prisma.refundRequest.update({
      where: { id: requestId },
      data: { status: 'PENDING_SECOND' }
    });
    
    // 发送通知给管理员
    await notifyAdmin(requestId, '待二审退款申请');
  } else {
    // 自动通过
    await autoApprove(requestId, riskResult);
  }
}

async function autoApprove(
  requestId: string,
  riskResult: RiskCheckResult
): Promise<void> {
  await prisma.$transaction([
    prisma.refundRequest.update({
      where: { id: requestId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        processedBy: 'SYSTEM'
      }
    }),
    prisma.refundHistory.create({
      data: {
        refundId: requestId,
        action: 'AUTO_APPROVE',
        operator: 'system',
        note: `风控评分: ${riskResult.score}, 自动通过`
      }
    })
  ]);
  
  // 异步执行退款
  setImmediate(() => executeRefund(requestId));
}
```

### 2. 人工审核流程

```typescript
// 管理员审核接口
export async function manualReview(
  requestId: string,
  adminId: string,
  decision: 'approve' | 'reject',
  note?: string
): Promise<void> {
  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId }
  });
  
  if (!request) throw new Error('申请不存在');
  if (request.status !== 'PENDING' && request.status !== 'PENDING_SECOND') {
    throw new Error('申请状态不正确');
  }
  
  if (decision === 'approve') {
    // 一审通过
    if (request.status === 'PENDING') {
      await prisma.refundRequest.update({
        where: { id: requestId },
        data: {
          status: 'PROCESSING',
          processedAt: new Date(),
          processedBy: adminId
        }
      });
      
      setImmediate(() => executeRefund(requestId));
    } 
    // 二审通过
    else if (request.status === 'PENDING_SECOND') {
      await prisma.refundRequest.update({
        where: { id: requestId },
        data: {
          status: 'PROCESSING',
          secondApprovedBy: adminId
        }
      });
      
      setImmediate(() => executeRefund(requestId));
    }
  } else {
    // 拒绝
    await prisma.refundRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: adminId,
        remark: note
      }
    });
    
    // 更新统计
    await prisma.userRefundStats.update({
      where: { userId: request.userId },
      data: { rejectedCount: { increment: 1 } }
    });
  }
  
  // 记录历史
  await prisma.refundHistory.create({
    data: {
      refundId: requestId,
      action: decision === 'approve' ? 'APPROVE' : 'REJECT',
      operator: adminId,
      note
    }
  });
}
```

---

## 权益回收机制

```typescript
/**
 * 退款成功后回收用户权益
 */
async function revokeBenefits(order: Order): Promise<void> {
  // 1. 回收VIP权益
  if (order.productType === 'vip' && order.afterVipLevel) {
    const user = await prisma.user.findUnique({
      where: { id: order.userId }
    });
    
    if (user && user.vipLevel === order.afterVipLevel) {
      // 降级回购买前等级
      await prisma.user.update({
        where: { id: order.userId },
        data: {
          vipLevel: order.beforeVipLevel || 0,
          vipExpiresAt: order.beforeVipLevel ? user.vipExpiresAt : null,
          role: order.beforeVipLevel ? user.role : 'USER'
        }
      });
      
      // 记录权益回收日志
      await prisma.benefitRevokeLog.create({
        data: {
          userId: order.userId,
          refundId: order.id,
          revokedAt: new Date(),
          reason: '退款自动回收VIP权益'
        }
      });
    }
  }
  
  // 2. 回收积分（如果是积分充值订单）
  if (order.productType === 'points') {
    const user = await prisma.user.findUnique({
      where: { id: order.userId }
    });
    
    if (user) {
      const product = await prisma.product.findUnique({
        where: { id: order.productId }
      });
      
      if (product?.points) {
        // 如果用户积分足够，直接扣除
        if (user.points >= product.points) {
          await prisma.user.update({
            where: { id: order.userId },
            data: { points: { decrement: product.points } }
          });
          
          // 创建扣除记录
          await prisma.transaction.create({
            data: {
              userId: order.userId,
              type: 'adjust',
              amount: -product.points,
              balance: user.points - product.points,
              description: '退款权益回收-扣除积分',
              orderId: order.id
            }
          });
        } else {
          // 积分不足，积分清零并记录欠款
          await prisma.user.update({
            where: { id: order.userId },
            data: { points: 0 }
          });
          
          // 记录异常
          console.warn(`[Refund] 用户 ${order.userId} 积分不足，已清零`);
        }
      }
    }
  }
}
```

---

## API 接口

### 提交退款申请

**Endpoint:** `POST /api/orders/:id/refund`

**Request Body:**
```typescript
{
  reason: string;        // 退款原因
  description?: string;  // 详细说明
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    refundId: string;
    refundNo: string;
    status: 'PENDING';
    estimatedTime: string;  // 预计处理时间
  };
}
```

### 查询退款状态

**Endpoint:** `GET /api/refunds/:id`

**Response:**
```typescript
{
  success: true;
  data: {
    id: string;
    refundNo: string;
    status: string;
    amount: number;
    reason: string;
    createdAt: string;
    processedAt?: string;
    remark?: string;
    history: Array<{
      action: string;
      operator: string;
      note?: string;
      createdAt: string;
    }>;
  };
}
```

---

## 扩展阅读

- [订单管理系统](../08_订单管理/订单管理系统.md) - 退款订单关联
- [VIP会员体系](../04_用户增值服务/VIP会员体系.md) - 权益回收机制
- [积分系统](../04_用户增值服务/积分系统.md) - 积分回收

---

## 变更历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-02-16 | 基于代码实现重写，添加7层风控规则 |

---

**维护者:** YH-AI PPT 技术团队  
**最后更新:** 2026-02-16
