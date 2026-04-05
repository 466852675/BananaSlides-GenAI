// server/src/controllers/auth.controller.ts
// 认证控制器：处理认证相关的 HTTP 请求

import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { getClientIp } from '../middlewares/auth.middleware';

/**
 * 用户注册
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
    try {
        const { email, password, nickname, inviteCode } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '邮箱和密码不能为空' }
            });
            return;
        }

        const result = await AuthService.register({ email, password, nickname, inviteCode });

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        if (error.name === 'AuthError') {
            res.status(400).json({
                success: false,
                error: { code: error.code, message: error.message }
            });
            return;
        }

        console.error('[Auth] 注册失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '注册失败，请稍后重试' }
        });
    }
}

/**
 * 用户登录
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { identity, password } = req.body;

        if (!identity || !password) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '账号和密码不能为空' }
            });
            return;
        }

        const clientIp = getClientIp(req);
        const result = await AuthService.login(identity, password, clientIp);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        if (error.name === 'AuthError') {
            const statusCode = error.code === 'ACCOUNT_LOCKED' ? 403 : 401;
            res.status(statusCode).json({
                success: false,
                error: { code: error.code, message: error.message }
            });
            return;
        }

        console.error('[Auth] 登录失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '登录失败，请稍后重试' }
        });
    }
}

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export async function me(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '请先登录' }
            });
            return;
        }

        const user = await AuthService.getCurrentUser(req.user.id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error: any) {
        if (error.name === 'AuthError') {
            res.status(404).json({
                success: false,
                error: { code: error.code, message: error.message }
            });
            return;
        }

        console.error('[Auth] 获取用户信息失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取用户信息失败' }
        });
    }
}

/**
 * 刷新 Token
 * POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '请先登录' }
            });
            return;
        }

        const newToken = await AuthService.refreshUserToken(req.user.id);

        res.status(200).json({
            success: true,
            data: { token: newToken }
        });
    } catch (error: any) {
        console.error('[Auth] 刷新 Token 失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '刷新 Token 失败' }
        });
    }
}

/**
 * 忘记密码 - 发送验证码
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '邮箱不能为空' }
            });
            return;
        }

        await AuthService.forgotPassword(email);

        res.status(200).json({
            success: true,
            message: '如果该邮箱已注册，验证码将发送至您的邮箱'
        });
    } catch (error: any) {
        console.error('[Auth] 发送验证码失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '发送验证码失败，请稍后重试' }
        });
    }
}

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '邮箱、验证码和新密码不能为空' }
            });
            return;
        }

        await AuthService.resetPassword(email, code, newPassword);

        res.status(200).json({
            success: true,
            message: '密码重置成功'
        });
    } catch (error: any) {
        if (error.name === 'AuthError') {
            res.status(400).json({
                success: false,
                error: { code: error.code, message: error.message }
            });
            return;
        }

        console.error('[Auth] 重置密码失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '重置密码失败，请稍后重试' }
        });
    }
}

/**
 * 修改密码（已登录用户）
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '请先登录' }
            });
            return;
        }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '原密码和新密码不能为空' }
            });
            return;
        }

        await AuthService.changePassword(req.user.id, oldPassword, newPassword);

        res.status(200).json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error: any) {
        if (error.name === 'AuthError') {
            res.status(400).json({
                success: false,
                error: { code: error.code, message: error.message }
            });
            return;
        }

        console.error('[Auth] 修改密码失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '修改密码失败，请稍后重试' }
        });
    }
}

/**
 * 更新个人资料
 * PUT /api/auth/me
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '请先登录' }
            });
            return;
        }

        const { nickname, avatar, phone, bio } = req.body;
        const user = await AuthService.updateProfile(req.user.id, { nickname, avatar, phone, bio });

        res.status(200).json({
            success: true,
            data: user,
            message: '资料更新成功'
        });
    } catch (error: any) {
        console.error('[Auth] 更新资料失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '更新资料失败' }
        });
    }
}

/**
 * 发送手机验证码
 * POST /api/auth/send-code
 */
export async function sendPhoneCode(req: Request, res: Response): Promise<void> {
    try {
        const { phone } = req.body;
        if (!phone) {
            res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '手机号不能为空' } });
            return;
        }

        await AuthService.sendPhoneCode(phone);
        res.status(200).json({ success: true, message: '验证码已发送' });
    } catch (error: any) {
        res.status(error.code === 'INVALID_PHONE' ? 400 : 500).json({
            success: false,
            error: { code: error.code || 'INTERNAL_ERROR', message: error.message }
        });
    }
}

/**
 * 手机验证码登录
 * POST /api/auth/login-phone
 */
export async function loginWithPhone(req: Request, res: Response): Promise<void> {
    try {
        const { phone, code } = req.body;
        if (!phone || !code) {
            res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '手机号和验证码不能为空' } });
            return;
        }

        const result = await AuthService.loginWithPhone(phone, code);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        res.status(error.code === 'INVALID_CODE' ? 401 : 400).json({
            success: false,
            error: { code: error.code || 'INTERNAL_ERROR', message: error.message }
        });
    }
}

