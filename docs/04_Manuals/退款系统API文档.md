# Refund System API Documentation

## Overview

The refund system provides end-to-end functionality for processing payment refunds in the BananaSlides platform. It includes user-facing APIs for refund applications, admin APIs for audit/management, and webhook endpoints for payment provider notifications.

## Base URL

```
Development: http://localhost:1111
Production:  https://your-domain.com
```

---

## User APIs

### 1. Check Refund Eligibility

Check if an order is eligible for refund before applying.

**Endpoint:** `GET /api/refunds/orders/{orderId}/eligibility`

**Authentication:** Bearer Token required

**Response:**
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

**Error Response (Not Eligible):**
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

**Eligibility Criteria:**
- Order must be in `PAID` status
- Order must be paid within the last 7 days
- User must NOT have created any projects
- User must NOT have generated any PPTs

---

### 2. Apply for Refund

Submit a refund application for an order.

**Endpoint:** `POST /api/refunds/orders/{orderId}/apply`

**Authentication:** Bearer Token required

**Request Body:**
```json
{
  "reason": "Not satisfied with the service"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "退款申请已提交",
  "data": {
    "id": "refund-456",
    "refundNo": "REF-20240205-001",
    "orderId": "order-123",
    "amount": 100.00,
    "reason": "Not satisfied with the service",
    "status": "PENDING",
    "createdAt": "2024-02-05T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "该订单已存在退款申请"
}
```

---

### 3. Get My Refund History

Retrieve all refund applications for the current user.

**Endpoint:** `GET /api/refunds/my`

**Authentication:** Bearer Token required

**Query Parameters:**
| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| status    | string | No       | Filter by status         |
| page      | number | No       | Page number (default: 1) |
| limit     | number | No       | Items per page (default: 10) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "refund-456",
      "refundNo": "REF-20240205-001",
      "orderId": "order-123",
      "amount": 100.00,
      "reason": "Not satisfied with the service",
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

**Status Values:**
- `PENDING` - 待审核
- `PROCESSING` - 处理中
- `COMPLETED` - 已完成
- `REJECTED` - 已拒绝
- `FAILED` - 处理失败
- `MANUAL_REQUIRED` - 需人工处理

---

### 4. Get Refund Detail

Get detailed information about a specific refund request.

**Endpoint:** `GET /api/refunds/{refundId}`

**Authentication:** Bearer Token required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "refund-456",
    "refundNo": "REF-20240205-001",
    "orderId": "order-123",
    "amount": 100.00,
    "reason": "Not satisfied with the service",
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

## Admin APIs

### 5. List All Refund Requests

Retrieve all refund requests (admin only).

**Endpoint:** `GET /api/admin/refunds`

**Authentication:** Bearer Token + Admin Role required

**Query Parameters:**
| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| status    | string | No       | Filter by status         |
| userId    | string | No       | Filter by user ID        |
| startDate | string | No       | Start date (YYYY-MM-DD)  |
| endDate   | string | No       | End date (YYYY-MM-DD)    |
| page      | number | No       | Page number (default: 1) |
| limit     | number | No       | Items per page (default: 20) |

**Response:**
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
      "reason": "Not satisfied with the service",
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

### 6. Get Refund Statistics

Get refund statistics for dashboard (admin only).

**Endpoint:** `GET /api/admin/refunds/stats`

**Authentication:** Bearer Token + Admin Role required

**Response:**
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

### 7. Get Refund Detail (Admin)

Get detailed refund information including user and order details (admin only).

**Endpoint:** `GET /api/admin/refunds/{id}`

**Authentication:** Bearer Token + Admin Role required

**Response:** Same as user refund detail with additional admin fields.

---

### 8. Audit Refund Request

Approve or reject a refund request (admin only).

**Endpoint:** `POST /api/admin/refunds/{id}/audit`

**Authentication:** Bearer Token + Admin Role required

**Request Body:**
```json
{
  "action": "APPROVED",
  "note": "Approved - within 7 days and no usage"
}
```

**Action Values:**
- `APPROVED` - Approve the refund
- `REJECTED` - Reject the refund

**Response (Success - Approved):**
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

**Response (Success - Rejected):**
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

**Note:** When a refund is approved, the system automatically:
1. Processes the payment refund via WeChat Pay or Alipay
2. Revokes the granted credits from the user's account
3. Updates the order status

---

## Webhook APIs

### 9. WeChat Pay Refund Notification

Endpoint for WeChat Pay to send refund status notifications.

**Endpoint:** `POST /webhooks/wechat/refund`

**Content-Type:** `application/xml`

**Request Body (XML):**
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <out_refund_no><![CDATA[REF-20240205-001]]></out_refund_no>
  <out_trade_no><![CDATA[ORD-20240205-001]]></out_trade_no>
  <refund_id><![CDATA[wx_refund_123]]></refund_id>
  <refund_status><![CDATA[SUCCESS]]></refund_status>
</xml>
```

**Response (Success):**
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <return_msg><![CDATA[OK]]></return_msg>
</xml>
```

---

### 10. Alipay Refund Notification

Endpoint for Alipay to send refund status notifications.

**Endpoint:** `POST /webhooks/alipay/refund`

**Content-Type:** `application/x-www-form-urlencoded`

**Request Body (Form Data):**
```
out_trade_no=ORD-20240205-001
out_request_no=REF-20240205-001
trade_no=ALIPAY_TRADE_123
refund_fee=100.00
gmt_refund_pay=2024-02-05 11:05:00
sign=signature_string
```

**Response (Success):**
```
success
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| ORDER_NOT_FOUND | Order does not exist | 404 |
| ORDER_NOT_PAID | Order is not paid | 400 |
| REFUND_WINDOW_EXPIRED | Refund period has expired (>7 days) | 400 |
| USER_HAS_PROJECTS | User has created projects | 400 |
| USER_HAS_GENERATED_PPT | User has generated PPTs | 400 |
| REFUND_ALREADY_EXISTS | Refund request already exists | 400 |
| REFUND_NOT_FOUND | Refund request not found | 404 |
| INSUFFICIENT_PERMISSIONS | User lacks required permissions | 403 |
| PROCESSING_ERROR | Internal processing error | 500 |
| PAYMENT_FAILED | Payment refund failed | 500 |

---

## Refund Status Lifecycle

```
[PENDING] → Admin approves → [PROCESSING] → Payment success → [COMPLETED]
                ↓
         Admin rejects → [REJECTED]
                ↓
         Payment fails → [FAILED] → Retry → [PROCESSING]
                ↓
         Max retries exceeded → [MANUAL_REQUIRED]
```

---

## Testing

### Mock Payment Mode

In development environment, payment services run in mock mode with simulated responses:
- WeChat Pay: 95% success rate
- Alipay: 97% success rate

### Test Scenarios

1. **Successful Refund Flow:**
   ```bash
   # Create order → Pay → Apply refund → Admin approve
   curl -X POST http://localhost:1111/api/orders \
     -H "Authorization: Bearer TOKEN" \
     -d '{"productId": "prod-1", "amount": 100}'
   
   curl -X POST http://localhost:1111/api/refunds/orders/ORDER_ID/apply \
     -H "Authorization: Bearer TOKEN" \
     -d '{"reason": "Test refund"}'
   
   curl -X POST http://localhost:1111/api/admin/refunds/REFUND_ID/audit \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -d '{"action": "APPROVED", "note": "Test"}'
   ```

2. **Ineligible Refund (Has Projects):**
   ```bash
   # Create project → Try refund (will fail)
   curl -X POST http://localhost:1111/api/projects \
     -H "Authorization: Bearer TOKEN" \
     -d '{"name": "Test Project"}'
   
   curl http://localhost:1111/api/refunds/orders/ORDER_ID/eligibility \
     -H "Authorization: Bearer TOKEN"
   # Response: eligible: false, reason: "用户已创建项目"
   ```

---

## Production Checklist

Before deploying to production:

1. **Payment Provider Configuration:**
   - [ ] Configure WeChat Pay credentials (mchId, appId, apiKey, certPath)
   - [ ] Configure Alipay credentials (appId, privateKey, publicKey)
   - [ ] Set `isMockMode = false` in payment services
   - [ ] Install production SDKs:
     ```bash
     npm install wechatpay-node-v3 alipay-sdk
     ```

2. **Webhook Configuration:**
   - [ ] Register webhook URLs in WeChat Pay merchant platform
   - [ ] Register webhook URLs in Alipay open platform
   - [ ] Configure webhook signature verification

3. **Environment Variables:**
   ```env
   WECHAT_MCH_ID=your_mch_id
   WECHAT_APP_ID=your_app_id
   WECHAT_API_KEY=your_api_key
   WECHAT_CERT_PATH=/path/to/cert.p12
   
   ALIPAY_APP_ID=your_app_id
   ALIPAY_PRIVATE_KEY=your_private_key
   ALIPAY_PUBLIC_KEY=alipay_public_key
   ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
   ```

4. **Monitoring & Alerts:**
   - [ ] Set up alerts for failed refunds
   - [ ] Monitor refund success rate
   - [ ] Configure logs retention policy

---

## Support

For issues or questions regarding the refund system:

1. Check application logs: `server/logs/refund-*.log`
2. Review refund retry logs in database
3. Contact: support@your-domain.com
