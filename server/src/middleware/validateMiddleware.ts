import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * 验证中间件 - 使用 Zod 验证请求体
 * @param schema Zod 验证模式
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // 验证请求体
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // 格式化错误信息
                const messages = error.issues.map((e) => {
                    const path = e.path.join('.');
                    return path ? `${path}: ${e.message}` : e.message;
                });

                console.warn('[Validation] 请求验证失败:', messages);

                return res.status(400).json({
                    success: false,
                    error: '输入验证失败',
                    details: messages
                });
            }

            // 未知错误
            console.error('[Validation] 验证过程发生未知错误:', error);
            return res.status(500).json({
                success: false,
                error: '验证错误'
            });
        }
    };
};

/**
 * 可选验证中间件 - 只在有请求体时验证
 * @param schema Zod 验证模式
 */
export const validateOptional = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // 如果没有请求体,跳过验证
        if (!req.body || Object.keys(req.body).length === 0) {
            return next();
        }
        return validate(schema)(req, res, next);
    };
};
