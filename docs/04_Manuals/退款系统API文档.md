# 退款系统 API 文档

## 概述

退款系统为 YH-AI PPT 平台提供端到端的退款处理功能。包括用户端退款申请接口、管理员审核/管理接口，以及支付服务商的 Webhook 回调接口。

## 基础 URL

```
开发环境: http://localhost:1111
生产环境: https://your-domain.com
```

---

## 用户接口

### 1. 检查退款资格

在申请退款前检查订单是否符合退款条件。

**接口:** `GET /api/refunds/orders/{orderId}/eligibility`

**认证:** 需要 Bearer Token

**响应:**
```json
{
  "eligible": true,
  "orderId": "order-123",
  "amount": 100.00,
  "reason": null,
  "policy": {
    "maxDays": 7,
    "maxPercentage": 100,
    "maxAmount": 100.00
  }
}
```

**错误响应 (不符合条件):**
```json
{
  "eligible": false,
  "orderId": "order-123",
  "amount": 0,
  "reason": "订单已超过7天退款期限",
  "policy": {
    "maxDays": 7,
    "maxPercentage": 100,
    "maxAmount": 100.00
  }
}
```

**资格条件:**
- 订单必须处于 `PAID` 状态
- 订单必须在最近7天内支付
- 用户不能创建过任何项目
- 用户不能生成过任何PPT

---

### 2. 申请退款

提交订单退款申请。

**接口:** `POST /api/refunds/orders/{orderId}/apply`

**认证:** 需要 Bearer Token

**请求体:**
```json
{
  "reason": "对服务不满意"
}
```

**响应 (成功):**
```json
{
  "success": true,
  "message": "退款申请已提交",
  "data": {
    "id": "refund-456",
    "refundNo": "REF-20240205-001",
    "orderId": "order-123",
    "amount": 100.00,
    "reason": "对服务不满意",
    "status": "PENDING",
    "createdAt": "2024-02-05T10:30:00Z"
  }
}
```

**响应 (错误):**
```json
{
  "success": false,
  "message": "该订单已存在退款申请"
}
```

---

### 3. 获取我的退款历史

查询当前用户的所有退款申请记录。

**接口:** `GET /api/refunds/my`

**认证:** 需要 Bearer Token

**查询参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 按状态筛选 |
| page | number | 否 | 页码 (默认: 1) |
| limit | number | 否 | 每页数量 (默认: 10) |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "refund-456",
      "refundNo": "REF-20240205-001",
      "orderId": "order-123",
      "amount": 100.00,
      "reason": "对服务不满意",
      "status": "PENDING",
      "createdAt": "2024-02-05T10:30:00Z",
      "order": {
        "orderNo": "ORD-20240205-001",
        "amount": 100.00,
        "creditsGranted": 1000
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**状态值:**
- `PENDING` - 待审核
- `PROCESSING` - 处理中
- `COMPLETED` - 已完成
- `REJECTED` - 已拒绝
- `FAILED` - 处理失败
- `MANUAL_REQUIRED` - 需人工处理

---

### 4. 获取退款详情

获取指定退款申请的详细信息。

**接口:** `GET /api/refunds/{refundId}`

**认证:** 需要 Bearer Token

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "refund-456",
    "refundNo": "REF-20240205-001",
    "orderId": "order-123",
    "amount": 100.00,
    "reason": "对服务不满意",
    "status": "COMPLETED",
    "auditNote": "Approved - within policy",
    "createdAt": "2024-02-05T10:30:00Z",
    "processedAt": "2024-02-05T11:00:00Z",
    "completedAt": "2024-02-05T11:05:00Z",
    "order": {
      "orderNo": "ORD-20240205-001",
      "amount": 100.00,
      "creditsGranted": 1000,
      "paymentMethod": "wechat"
    },
    "retryLogs": [
      {
        "retryCount": 1,
        "status": "success",
        "executedAt": "2024-02-05T11:00:00Z"
      }
    ]
  }
}
```

---

## 管理员接口

### 5. 获取所有退款申请列表

查询所有退款申请记录（仅管理员）。

**接口:** `GET /api/admin/refunds`

**认证:** 需要 Bearer Token + 管理员角色

**查询参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 按状态筛选 |
| userId | string | 否 | 按用户ID筛选 |
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |
| page | number | 否 | 页码 (默认: 1) |
| limit | number | 否 | 每页数量 (默认: 20) |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "refund-456",
      "refundNo": "REF-20240205-001",
      "userId": "user-789",
      "user": {
        "email": "user@example.com",
        "name": "John Doe"
      },
      "orderId": "order-123",
      "amount": 100.00,
      "reason": "对服务不满意",
      "status": "PENDING",
      "createdAt": "2024-02-05T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 6. 获取退款统计数据

获取管理后台的退款统计数据（仅管理员）。

**接口:** `GET /api/admin/refunds/stats`

**认证:** 需要 Bearer Token + 管理员角色

**响应:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCount": 150,
      "totalAmount": 15000.00,
      "pendingCount": 10,
      "pendingAmount": 1000.00,
      "approvedCount": 120,
      "approvedAmount": 12000.00,
      "rejectedCount": 15,
      "rejectedAmount": 1500.00,
      "failedCount": 5,
      "failedAmount": 500.00
    },
    "recent": [
      {
        "date": "2024-02-05",
        "count": 5,
        "amount": 500.00
      }
    ]
  }
}
```

---

### 7. 获取退款详情（管理员）

获取包含用户和订单详细信息的退款信息（仅管理员）。

**接口:** `GET /api/admin/refunds/{id}`

**认证:** 需要 Bearer Token + 管理员角色

**响应:** 与用户退款详情相同，包含额外的管理员字段。

---

### 8. 审核退款申请

批准或拒绝退款申请（仅管理员）。

**接口:** `POST /api/admin/refunds/{id}/audit`

**认证:** 需要 Bearer Token + 管理员角色

**请求体:**
```json
{
  "action": "APPROVED",
  "note": "Approved - within 7 days and no usage"
}
```

**操作值:**
- `APPROVED` - 批准退款
- `REJECTED` - 拒绝退款

**响应 (成功 - 批准):**
```json
{
  "success": true,
  "message": "退款已审核通过",
  "data": {
    "id": "refund-456",
    "status": "COMPLETED",
    "auditNote": "Approved - within 7 days and no usage",
    "processedAt": "2024-02-05T11:00:00Z",
    "completedAt": "2024-02-05T11:05:00Z"
  }
}
```

**响应 (成功 - 拒绝):**
```json
{
  "success": true,
  "message": "退款申请已拒绝",
  "data": {
    "id": "refund-456",
    "status": "REJECTED",
    "auditNote": "User has already created projects",
    "processedAt": "2024-02-05T11:00:00Z"
  }
}
```

**注意:** 当退款被批准时，系统会自动：
1. 通过微信支付或支付宝处理支付退款
2. 从用户账户中撤销已发放的积分
3. 更新订单状态

---

## Webhook 接口

### 9. 微信支付退款通知

微信支付发送退款状态通知的接口。

**接口:** `POST /webhooks/wechat/refund`

**Content-Type:** `application/xml`

**请求体 (XML):**
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <out_refund_no><![CDATA[REF-20240205-001]]></out_refund_no>
  <out_trade_no><![CDATA[ORD-20240205-001]]></out_trade_no>
  <refund_id><![CDATA[wx_refund_123]]></refund_id>
  <refund_status><![CDATA[SUCCESS]]></refund_status>
</xml>
```

**响应 (成功):**
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <return_msg><![CDATA[OK]]></return_msg>
</xml>
```

---

### 10. 支付宝退款通知

支付宝发送退款状态通知的接口。

**接口:** `POST /webhooks/alipay/refund`

**Content-Type:** `application/x-www-form-urlencoded`

**请求体 (表单数据):**
```
out_trade_no=ORD-20240205-001
out_request_no=REF-20240205-001
trade_no=ALIPAY_TRADE_123
refund_fee=100.00
gmt_refund_pay=2024-02-05 11:05:00
sign=signature_string
```

**响应 (成功):**
```
success
```

---

## 错误码

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| ORDER_NOT_FOUND | 订单不存在 | 404 |
| ORDER_NOT_PAID | 订单未支付 | 400 |
| REFUND_WINDOW_EXPIRED | 退款期限已过期 (>7天) | 400 |
| USER_HAS_PROJECTS | 用户已创建项目 | 400 |
| USER_HAS_GENERATED_PPT | 用户已生成PPT | 400 |
| REFUND_ALREADY_EXISTS | 退款申请已存在 | 400 |
| REFUND_NOT_FOUND | 退款申请不存在 | 404 |
| INSUFFICIENT_PERMISSIONS | 用户权限不足 | 403 |
| PROCESSING_ERROR | 内部处理错误 | 500 |
| PAYMENT_FAILED | 支付退款失败 | 500 |

---

## 退款状态生命周期

```
[PENDING] → 管理员批准 → [PROCESSING] → 支付成功 → [COMPLETED]
                ↓
         管理员拒绝 → [REJECTED]
                ↓
         支付失败 → [FAILED] → 重试 → [PROCESSING]
                ↓
         超过最大重试次数 → [MANUAL_REQUIRED]
```

---

## 测试

### 模拟支付模式

在开发环境中，支付服务以模拟模式运行，使用模拟响应：
- 微信支付: 95% 成功率
- 支付宝: 97% 成功率

### 测试场景

1. **成功退款流程:**
   ```bash
   # 创建订单 → 支付 → 申请退款 → 管理员批准
   curl -X POST http://localhost:1111/api/orders \
     -H "Authorization: Bearer TOKEN" \
     -d '{"productId": "prod-1", "amount": 100}'
   
   curl -X POST http://localhost:1111/api/refunds/orders/ORDER_ID/apply \
     -H "Authorization: Bearer TOKEN" \
     -d '{"reason": "Test refund"}'
   
   curl -X POST http://localhost:1111/api/admin/refunds/REFUND_ID/audit \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -d '{"action": "APPROVED", "note": "Test approval"}'
   ```

2. **拒绝退款场景:**
   ```bash
   # 用户创建项目后申请退款
   # 预期结果: 退款申请被拒绝
   ```

3. **过期退款场景:**
   ```bash
   # 8天后申请退款
   # 预期结果: 退款申请被拒绝
   ```
