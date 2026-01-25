// src/api/auth.ts
// 认证 API 模块

import { client, TOKEN_KEY } from './client';

// ============================================================
// 类型定义
// ============================================================

export interface User {
    id: string;
    email: string | null;
    username: string | null;
    nickname: string | null;
    avatar: string | null;
    bio?: string | null;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    status: 'ACTIVE' | 'DISABLED' | 'PENDING';
    points: number;
    pointsUsed: number;
    vipLevel: number;
    vipExpiresAt: string | null;
    createdAt: string;
}

export interface AuthResult {
    user: User;
    token: string;
    expiresIn: number;
}

export interface UpdateProfileData {
    nickname?: string;
    avatar?: string;
    phone?: string;
    bio?: string;
}

export interface RegisterData {
    email: string;
    password: string;
    nickname?: string;
}

export interface LoginData {
    identity: string;
    password: string;
}

// ============================================================
// API 函数
// ============================================================

/**
 * 用户注册
 */
export async function register(data: RegisterData): Promise<AuthResult> {
    const result = await client.post('/auth/register', data) as any;

    if (result.success && result.data) {
        // 存储 Token
        localStorage.setItem(TOKEN_KEY, result.data.token);
        return result.data;
    }

    throw new Error(result.error?.message || '注册失败');
}

/**
 * 用户登录
 */
export async function login(data: LoginData): Promise<AuthResult> {
    const result = await client.post('/auth/login', data) as any;

    if (result.success && result.data) {
        // 存储 Token
        localStorage.setItem(TOKEN_KEY, result.data.token);
        return result.data;
    }

    throw new Error(result.error?.message || '登录失败');
}

/**
 * 退出登录
 */
export function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:logout'));
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
    const result = await client.get('/auth/me') as any;

    if (result.success && result.data) {
        return result.data;
    }

    throw new Error(result.error?.message || '获取用户信息失败');
}

/**
 * 更新个人资料
 */
export async function updateProfile(data: UpdateProfileData): Promise<User> {
    const result = await client.put('/auth/me', data) as any;

    if (result.success && result.data) {
        return result.data;
    }

    throw new Error(result.error?.message || '更新资料失败');
}

/**
 * 发送密码重置验证码
 */
export async function forgotPassword(email: string): Promise<void> {
    const result = await client.post('/auth/forgot-password', { email }) as any;

    if (!result.success) {
        throw new Error(result.error?.message || '发送验证码失败');
    }
}

/**
 * 重置密码
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const result = await client.post('/auth/reset-password', { email, code, newPassword }) as any;

    if (!result.success) {
        throw new Error(result.error?.message || '重置密码失败');
    }
}

/**
 * 修改密码
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const result = await client.post('/auth/change-password', { oldPassword, newPassword }) as any;

    if (!result.success) {
        throw new Error(result.error?.message || '修改密码失败');
    }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
}

/**
 * 获取当前 Token
 */
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}
