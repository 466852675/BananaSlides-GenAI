// server/src/middlewares/auth.middleware.ts
// 认证中间件：JWT 验证和角色检查

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { verifyToken, JwtPayload } from '../utils/jwt.util';

const prisma = new PrismaClient();

// 扩展 Express Request 类型以包含用户信息
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string | null;
                username: string | null;
                nickname: string | null;
                role: UserRole;
                status: UserStatus;
                points: number;
            };
        }
    }
}

/**
 * JWT 认证中间件
 * 验证 Token 并将用户信息附加到 req.user
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // 1. 获取 Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '请先登录' }
            });
            return;
        }

        const token = authHeader.substring(7); // 去掉 "Bearer " 前缀

        // 2. 验证 Token
        const payload = verifyToken(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                error: { code: 'INVALID_TOKEN', message: 'Token 无效或已过期' }
            });
            return;
        }

        // 3. 获取用户信息
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                role: true,
                status: true,
                points: true,
            }
        });

        if (!user) {
            res.status(401).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: '用户不存在' }
            });
            return;
        }

        // 4. 检查用户状态
        if (user.status === UserStatus.DISABLED) {
            res.status(401).json({
                success: false,
                error: { code: 'ACCOUNT_DISABLED', message: '账户已被禁用' }
            });
            return;
        }

        // 5. 附加用户信息到请求
        req.user = user;
        next();

    } catch (error) {
        console.error('[Auth] 认证失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'AUTH_ERROR', message: '认证服务异常' }
        });
    }
};

/**
 * 可选认证中间件
 * 如果有 Token 则验证，没有则继续（req.user 为 undefined）
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (payload) {
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    nickname: true,
                    role: true,
                    status: true,
                    points: true,
                }
            });

            if (user && user.status === UserStatus.ACTIVE) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // 可选认证失败不阻断请求
        next();
    }
};

/**
 * 角色检查中间件工厂
 * @param roles 允许的角色列表
 */
export const requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '请先登录' }
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: '权限不足' }
            });
            return;
        }

        next();
    };
};

/**
 * 管理员检查中间件
 */
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * 超级管理员检查中间件
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * 获取客户端 IP
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
