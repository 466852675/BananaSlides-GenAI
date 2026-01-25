// src/utils/auth.ts
// 认证工具函数

import { TOKEN_KEY } from '../api/client';

/**
 * 获取当前存储的认证 Token
 * @returns 当前 Token 或 null
 */
export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * 检查用户是否已认证
 * @returns 是否已登录
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken();
}
