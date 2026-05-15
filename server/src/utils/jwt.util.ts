import jwt from 'jsonwebtoken';
import { prisma } from '../db';

// 延迟获取 JWT_SECRET，确保 dotenv 已加载
let _JWT_SECRET: string | undefined;
let _checked = false;

function getJwtSecret(): string {
  if (!_checked) {
    _JWT_SECRET = process.env.JWT_SECRET;
    _checked = true;

    if (!_JWT_SECRET) {
      console.error('[JWT] JWT_SECRET environment variable is required');
      console.error('[JWT] Generate a strong secret: openssl rand -base64 32');
      throw new Error('JWT_SECRET environment variable is required for security');
    }

    if (_JWT_SECRET.length < 32) {
      console.warn('[JWT] Warning: JWT_SECRET should be at least 32 characters for security');
    }
  }
  return _JWT_SECRET!;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JwtPayload {
  userId: string;
  role: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

/**
 * 签发 Token（直接传入 payload）
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const expiresInSeconds = getTokenExpiresIn();
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresInSeconds,
    issuer: 'yh-ai-ppt',
    audience: 'yh-ai-ppt-users',
  });
}

/**
 * 为用户签发 Token（自动读取 tokenVersion）
 * 统一使用此函数替代直接 signToken，确保 tokenVersion 正确传递
 */
export async function signUserToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tokenVersion: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return signToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'yh-ai-ppt',
      audience: 'yh-ai-ppt-users',
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiresIn(): number {
  const match = JWT_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 86400;

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

export function refreshToken(token: string): string | null {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  return signToken({
    userId: decoded.userId,
    role: decoded.role,
    tokenVersion: decoded.tokenVersion,
  });
}
