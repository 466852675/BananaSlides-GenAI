import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  console.error('[JWT] JWT_SECRET environment variable is required');
  console.error('[JWT] Generate a strong secret: openssl rand -base64 32');
  throw new Error('JWT_SECRET environment variable is required for security');
}

if (JWT_SECRET.length < 32) {
  console.warn('[JWT] Warning: JWT_SECRET should be at least 32 characters for security');
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const expiresInSeconds = getTokenExpiresIn();
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: expiresInSeconds,
    issuer: 'bananaslides',
    audience: 'bananaslides-users',
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      issuer: 'bananaslides',
      audience: 'bananaslides-users',
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
  });
}
