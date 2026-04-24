// src/contexts/AuthContext.tsx
// 认证上下文：全局状态管理

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import * as AuthAPI from '../api/auth';
import { User } from '../api/auth';
import { TOKEN_KEY } from '../api/client';
import { getOutputMode } from '../services/geminiService';

// ============================================================
// 类型定义
// ============================================================

interface AuthContextType {
    // 状态
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;

    // 方法
    login: (identity: string, password: string) => Promise<void>;
    loginWithPhone: (phone: string, code: string) => Promise<void>;
    sendPhoneCode: (phone: string) => Promise<void>;
    register: (email: string, password: string, nickname?: string, inviteCode?: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;

    // 弹窗控制
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;
    loginModalTab: 'signin' | 'signup' | 'forgot';
    setLoginModalTab: (tab: 'signin' | 'signup' | 'forgot') => void;
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginModalTab, setLoginModalTab] = useState<'signin' | 'signup' | 'forgot'>('signin');

    // 计算属性
    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    // 刷新用户信息
    const refreshUser = useCallback(async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            // 检查会话时间 (24小时 = 86400000ms，与 JWT token 有效期对齐)
            const lastActive = localStorage.getItem('lastActiveTime');
            if (lastActive && Date.now() - parseInt(lastActive) > 24 * 60 * 60 * 1000) {
                // 会话过期
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem('lastActiveTime');
                setUser(null);
                window.location.href = '/login?expired=true';
                return;
            }

            // 更新最后活跃时间
            localStorage.setItem('lastActiveTime', Date.now().toString());

            const userData = await AuthAPI.getCurrentUser();
            setUser({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                nickname: userData.nickname,
                avatar: userData.avatar,
                role: userData.role,
                status: userData.status || 'ACTIVE',
                points: userData.points,
                pointsUsed: userData.pointsUsed ?? 0,
                vipLevel: userData.vipLevel ?? 0,
                vipExpiresAt: userData.vipExpiresAt ?? null,
                bio: userData.bio || null,
                inviteCode: userData.inviteCode,
                createdAt: userData.createdAt || '',
            });

            // 预热 outputMode 缓存，减少后续 AI 调用的延迟
            getOutputMode().catch(() => { /* 忽略错误 */ });
        } catch (error) {
            console.error('[Auth] 刷新用户信息失败:', error);
            // Token 无效，清除
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 登录
    const login = useCallback(async (identity: string, password: string) => {
        const result = await AuthAPI.login({ identity, password });
        setUser({
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            nickname: result.user.nickname,
            avatar: result.user.avatar,
            role: result.user.role,
            status: result.user.status || 'ACTIVE',
            points: result.user.points,
            pointsUsed: result.user.pointsUsed ?? 0,
            vipLevel: result.user.vipLevel ?? 0,
            vipExpiresAt: result.user.vipExpiresAt ?? null,
            bio: result.user.bio || null,
            inviteCode: result.user.inviteCode,
            createdAt: result.user.createdAt || '',
        });
        setShowLoginModal(false);
    }, []);

    // 手机号登录
    const loginWithPhone = useCallback(async (phone: string, code: string) => {
        const result = await AuthAPI.loginWithPhone(phone, code);
        setUser({
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            nickname: result.user.nickname,
            avatar: result.user.avatar,
            role: result.user.role,
            status: result.user.status || 'ACTIVE',
            points: result.user.points,
            pointsUsed: result.user.pointsUsed ?? 0,
            vipLevel: result.user.vipLevel ?? 0,
            vipExpiresAt: result.user.vipExpiresAt ?? null,
            bio: result.user.bio || null,
            inviteCode: result.user.inviteCode,
            createdAt: result.user.createdAt || '',
        });
        setShowLoginModal(false);
    }, []);

    // 发送验证码
    const sendPhoneCode = useCallback(async (phone: string) => {
        await AuthAPI.sendPhoneCode(phone);
    }, []);

    // 注册
    const register = useCallback(async (email: string, password: string, nickname?: string, inviteCode?: string) => {
        const result = await AuthAPI.register({ email, password, nickname, inviteCode });
        setUser({
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            nickname: result.user.nickname,
            avatar: result.user.avatar,
            role: result.user.role,
            status: result.user.status || 'ACTIVE',
            points: result.user.points,
            pointsUsed: result.user.pointsUsed ?? 0,
            vipLevel: result.user.vipLevel ?? 0,
            vipExpiresAt: result.user.vipExpiresAt ?? null,
            bio: result.user.bio || null,
            inviteCode: result.user.inviteCode,
            createdAt: result.user.createdAt || '',
        });
        setShowLoginModal(false);
    }, []);

    // 登出
    const logout = useCallback(() => {
        AuthAPI.logout();
        setUser(null);
        // 强制跳转到独立登录页
        window.location.href = '/login';
    }, []);

    // 初始化：检查 Token 并获取用户信息
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    // 监听登出事件（来自 API 拦截器的 401 响应）
    useEffect(() => {
        const handleLogout = () => {
            setUser(null);
            // setShowLoginModal(true); // Deprecated
            // setLoginModalTab('signin');

            // 如果不在登录页且不是落地页，则跳转登录页
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login?expired=true';
            }
        };

        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        login,
        loginWithPhone,
        sendPhoneCode,
        register,
        logout,
        refreshUser,
        showLoginModal,
        setShowLoginModal,
        loginModalTab,
        setLoginModalTab,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// Hook
// ============================================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// 导出默认值用于非 Provider 环境（如测试）
export default AuthContext;
