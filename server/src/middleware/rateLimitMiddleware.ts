/**
 * API 速率限制中间件
 * 防止 API 被滥用或 DDoS 攻击
 * 注意: 开发环境使用较宽松的限制
 */

import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// 通用 API 限制 - 开发环境宽松,生产环境严格
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: isDev ? 1000 : 300, // 开发: 1000次/分钟, 生产: 300次/分钟
    message: {
        success: false,
        error: '请求过于频繁,请稍后重试',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] IP ${req.ip} 超出请求限制`);
        res.status(429).json({
            success: false,
            error: '请求过于频繁,请稍后重试',
            code: 'RATE_LIMIT_EXCEEDED'
        });
    }
});

// AI 相关接口限制 - AI 请求消耗大,限制相对严格
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: isDev ? 100 : 30, // 开发: 100次/分钟, 生产: 30次/分钟
    message: {
        success: false,
        error: 'AI 请求过于频繁,请稍后重试',
        code: 'AI_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] IP ${req.ip} 超出 AI 请求限制`);
        res.status(429).json({
            success: false,
            error: 'AI 请求过于频繁,请稍后重试',
            code: 'AI_RATE_LIMIT_EXCEEDED'
        });
    }
});

// 上传接口限制
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 200 : 50, // 开发: 200次/分钟, 生产: 50次/分钟
    message: {
        success: false,
        error: '上传请求过于频繁,请稍后重试',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
