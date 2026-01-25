// server/src/utils/jwt.util.ts
// JWT 工具：签发与验证

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

// 从环境变量获取配置
const JWT_SECRET = process.env.JWT_SECRET || 'bananaslides-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * JWT Payload 结构
 */
export interface JwtPayload {
    userId: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

/**
 * 签发 JWT Token
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const expiresInSeconds = getTokenExpiresIn();
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: expiresInSeconds,
    });
}

/**
 * 验证 JWT Token
 * @returns 解码后的 payload，验证失败返回 null
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * 解码 Token（不验证签名，仅用于调试）
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        return jwt.decode(token) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * 获取 Token 过期时间（秒）
 */
export function getTokenExpiresIn(): number {
    const match = JWT_EXPIRES_IN.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // 默认 24 小时

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 86400;
    }
}
