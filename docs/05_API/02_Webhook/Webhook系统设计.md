---
title: Webhook系统设计
code_version: v1.0
last_updated: 2026-02-16
author: 后端团队
reviewer: 技术负责人
status: published
modules: [Webhook, 支付, 回调]
tags: [Webhook, 支付回调, 异步通知]
---

# Webhook系统设计

> **文档状态**: 已发布  
> **版本**: v1.0  
> **最后更新**: 2026-02-16

---

## 变更历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-02-16 | 后端团队 | 初始版本 |

---

## 1. 概述

Webhook系统负责接收第三方支付平台的异步回调通知，实现订单状态同步、退款处理等功能。

### 1.1 支持的Webhook

| Webhook类型 | 提供商 | 状态 |
|-------------|--------|------|
| 支付回调 | 支付宝 | ✅ |
| 支付回调 | 微信支付 | ✅ |
| 退款回调 | 支付宝 | ✅ |
| 退款回调 | 微信支付 | ✅ |

### 1.2 涉及文件

| 文件 | 说明 |
|------|------|
| `server/src/routes/webhook.routes.ts` | Webhook路由 |
| `server/src/services/payment/alipay.service.ts` | 支付宝服务 |
| `server/src/services/payment/wechat.service.ts` | 微信服务 |
| `server/src/services/order.service.ts` | 订单服务 |

---

## 2. Webhook接口

### 2.1 支付宝支付回调

**接口**: `POST /webhooks/alipay`

**触发场景**: 用户完成支付后，支付宝主动通知

**请求参数**:
```http
Content-Type: application/x-www-form-urlencoded

out_trade_no=2024021622001234567890
trade_no=2024021622001234567890
trade_status=TRADE_SUCCESS
total_amount=99.00
```

**处理逻辑**:
```typescript
// server/src/routes/webhook.routes.ts
router.post('/webhooks/alipay', async (req, res) => {
    // 1. 验证签名
    const isValid = await AlipayService.verifySignature(req.body);
    if (!isValid) {
        return res.status(400).send('fail');
    }
    
    // 2. 更新订单状态
    const { out_trade_no, trade_status } = req.body;
    
    if (trade_status === 'TRADE_SUCCESS') {
        await OrderService.updateStatus(out_trade_no, 'PAID');
        // 发放积分/VIP
        await OrderService.grantBenefits(out_trade_no);
    }
    
    // 3. 返回成功
    res.send('success');
});
```

### 2.2 支付宝退款回调

**接口**: `POST /webhooks/alipay/refund`

**触发场景**: 退款完成后，支付宝通知

**请求参数**:
```http
Content-Type: application/x-www-form-urlencoded

out_trade_no=2024021622001234567890
out_request_no=R2024021600001
refund_status=REFUND_SUCCESS
```

### 2.3 微信支付回调

**接口**: `POST /webhooks/wechat`

**触发场景**: 用户完成支付后，微信主动通知

**请求体**:
```xml
<xml>
    <return_code><![CDATA[SUCCESS]]></return_code>
    <result_code><![CDATA[SUCCESS]]></result_code>
    <out_trade_no><![CDATA[2024021622001234567890]]></out_trade_no>
    <transaction_id><![CDATA[4200001234202302161234567890]]></transaction_id>
    <total_fee>99</total_fee>
</xml>
```

**处理逻辑**:
```typescript
router.post('/webhooks/wechat', async (req, res) => {
    // 1. 验证签名
    const isValid = await WechatService.verifySignature(req.body);
    if (!isValid) {
        return res.status(400).xml({ return_code: 'FAIL' });
    }
    
    // 2. 处理业务逻辑
    const { out_trade_no, result_code } = req.body;
    
    if (result_code === 'SUCCESS') {
        await OrderService.updateStatus(out_trade_no, 'PAID');
    }
    
    // 3. 返回成功
    res.xml({ return_code: 'SUCCESS' });
});
```

### 2.4 微信退款回调

**接口**: `POST /webhooks/wechat/refund`

---

## 3. 安全机制

### 3.1 签名验证

#### 支付宝签名

```typescript
async verifySignature(params: any): Promise<boolean> {
    const sign = params.sign;
    const signType = params.sign_type;
    
    // 1. 除去sign和sign_type
    const paramsToSign = this.omit(params, ['sign', 'sign_type']);
    
    // 2. 排序并拼接
    const signString = this.buildSignString(paramsToSign);
    
    // 3. 验签
    return this.rsaVerify(signString, sign, this.publicKey);
}
```

#### 微信签名

```typescript
async verifySignature(params: any): Promise<boolean> {
    const { sign, ...rest } = params;
    
    // 1. 排序
    const stringA = Object.keys(rest)
        .sort()
        .map(key => `${key}=${rest[key]}`)
        .join('&');
    
    // 2. 拼接API Key
    const stringSignTemp = `${stringA}&key=${this.apiKey}`;
    
    // 3. MD5验签
    const expectedSign = md5(stringSignTemp).toUpperCase();
    
    return sign === expectedSign;
}
```

### 3.2 IP白名单

```typescript
// 仅允许支付平台IP访问
const ALIPAY_IPS = ['110.75.129.0/24', '110.75.131.0/24'];
const WECHAT_IPS = ['101.226.90.0/24', '101.226.91.0/24'];

const isAllowedIP = (ip: string) => {
    return ALIPAY_IPS.includes(ip) || WECHAT_IPS.includes(ip);
};
```

### 3.3 幂等性处理

```typescript
// 防止重复处理
const processWebhook = async (transactionId: string, handler: Function) => {
    // 使用Redis分布式锁
    const lockKey = `webhook:lock:${transactionId}`;
    
    const lock = await redis.setnx(lockKey, '1');
    if (!lock) {
        log.warn('Duplicate webhook', { transactionId });
        return { status: 'duplicate' };
    }
    
    // 设置过期时间
    await redis.expire(lockKey, 300); // 5分钟
    
    try {
        return await handler();
    } finally {
        await redis.del(lockKey);
    }
};
```

---

## 4. 错误处理

### 4.1 处理失败响应

| 情况 | 返回值 | 说明 |
|------|--------|------|
| 签名验证失败 | 400 FAIL | 通知平台重发 |
| 业务处理失败 | 500 FAIL | 通知平台重发 |
| 重复通知 | 200 success | 忽略 |

### 4.2 重试机制

支付平台会在以下情况重发通知：
- 收到非success响应
- 长时间未响应
- 网络超时

```typescript
// 重试策略
const RETRY_CONFIG = {
    maxRetries: 5,
    retryDelay: [0, 1000, 5000, 30000, 120000] // 递增延迟
};
```

---

## 5. 日志记录

### 5.1 记录内容

```typescript
log.info('[Webhook] Received', {
    type: 'alipay',
    outTradeNo: 'xxx',
    tradeStatus: 'TRADE_SUCCESS',
    timestamp: Date.now()
});
```

### 5.2 关键字段

| 字段 | 说明 |
|------|------|
| webhook_id | 唯一标识 |
| order_id | 订单ID |
| transaction_id | 第三方交易号 |
| amount | 金额 |
| status | 处理状态 |
| error | 错误信息 |

---

## 6. 本地开发测试

### 6.1 使用ngrok

```bash
# 启动ngrok
ngrok http 1111

# 配置回调URL
# 支付宝/微信后台配置:
# https://your-ngrok-id.ngrok.io/webhooks/alipay
```

### 6.2 Mock测试

```typescript
// 测试脚本
const mockWebhook = async (type: string, data: any) => {
    const endpoints = {
        alipay: '/webhooks/alipay',
        wechat: '/webhooks/wechat',
        alipay_refund: '/webhooks/alipay/refund',
        wechat_refund: '/webhooks/wechat/refund'
    };
    
    return fetch(`http://localhost:1111${endpoints[type]}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
};
```

---

## 7. 相关文档

- [支付系统配置指南](../04_Manuals/支付系统生产环境配置指南.md)
- [退款系统API文档](../04_Manuals/退款系统API文档.md)
- [完整数据字典](../03_Database/01_完整数据字典.md)
- [安全架构设计](../02_Architecture/04_安全架构.md)

---

**维护团队**: YH-AI PPT 后端团队  
**最后更新**: 2026-02-16
