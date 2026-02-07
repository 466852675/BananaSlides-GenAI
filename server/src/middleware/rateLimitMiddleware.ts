/**
 * API 速率限制中间件
 * 防止 API 被滥用或 DDoS 攻击
 * 注意: 开发环境使用较宽松的限制
 */

import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// 1. 通用 API 限制 - 开发环境极宽, 生产环境适中
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: isDev ? 10000 : 300, // 开发: 10000次/分钟 (应对并发请求), 生产: 300次/分钟
    message: {
        success: false,
        error: '请求过于频繁，请稍后重试',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit:General] IP ${req.ip} exceeded limit: ${req.method} ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            error: '请求过于频繁，请稍后重试',
            code: 'RATE_LIMIT_EXCEEDED'
        });
    }
});

// 2. 后台管理专项限制 - 后台加载指标多，单独提额
export const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 10000 : 1000, // 后台允许更高的并发 (1000次/分钟)
    message: {
        success: false,
        error: '后台操作过于频繁，请稍后重试',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit:Admin] IP ${req.ip} exceeded limit: ${req.method} ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            error: '加载统计数据失败，请求过于频繁',
            code: 'ADMIN_RATE_LIMIT_EXCEEDED'
        });
    }
});

// 3. AI 相关接口限制 - 保持相对严格
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 500 : 30, // 开发: 500次/分钟, 生产: 30次/分钟
    message: {
        success: false,
        error: 'AI 请求过于频繁，请稍后重试',
        code: 'AI_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 4. 上传接口限制
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 500 : 50, // 开发: 500次/分钟, 生产: 50次/分钟
    message: {
        success: false,
        error: '上传请求过于频繁，请稍后重试',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
