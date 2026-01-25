// server/src/services/auth.service.ts
// 认证服务：注册、登录、密码重置

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import {
    hashPassword,
    comparePassword,
    validatePasswordStrength,
    generateVerificationCode
} from '../utils/password.util';
import { signToken, getTokenExpiresIn } from '../utils/jwt.util';

const prisma = new PrismaClient();

// 账户锁定配置
const LOCK_CONFIG = {
    maxFailCount: 5,        // 最大失败次数
    lockDurationMs: 15 * 60 * 1000, // 锁定时长 15 分钟
};

// 验证码有效期
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 分钟

/**
 * 用户注册 DTO
 */
export interface RegisterDto {
    email: string;
    password: string;
    nickname?: string;
}

/**
 * 用户资料更新 DTO
 */
export interface UpdateProfileDto {
    nickname?: string;
    avatar?: string;
    phone?: string;
    bio?: string;
}

/**
 * 用户资料更新 DTO
 */
export interface UpdateProfileDto {
    nickname?: string;
    avatar?: string;
    phone?: string;
    bio?: string;
}

/**
 * 用户注册返回
 */
export interface AuthResult {
    user: {
        id: string;
        email: string | null;
        username: string | null;
        nickname: string | null;
        role: UserRole;
        points: number;
        vipLevel: number;
    };
    token: string;
    expiresIn: number;
}

/**
 * 错误码
 */
export class AuthError extends Error {
    constructor(public code: string, message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * 用户注册
 */
export async function register(data: RegisterDto): Promise<AuthResult> {
    // 1. 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        throw new AuthError('INVALID_EMAIL', '邮箱格式错误');
    }

    // 2. 验证密码强度
    const passwordCheck = validatePasswordStrength(data.password);
    if (!passwordCheck.valid) {
        throw new AuthError('WEAK_PASSWORD', passwordCheck.message || '密码强度不足');
    }

    // 3. 检查邮箱是否已存在
    const existing = await prisma.user.findUnique({
        where: { email: data.email }
    });
    if (existing) {
        throw new AuthError('EMAIL_EXISTS', '该邮箱已被注册');
    }

    // 4. 创建用户
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
        data: {
            email: data.email,
            passwordHash,
            nickname: data.nickname || data.email.split('@')[0],
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            points: 30, // 默认赠送 30 积分
        }
    });

    // 5. 签发 Token
    const token = signToken({ userId: user.id, role: user.role });

    // 6. 创建赠送积分的交易记录
    await prisma.transaction.create({
        data: {
            userId: user.id,
            type: 'bonus',
            amount: 30,
            balance: 30,
            description: '新用户注册赠送',
        }
    });

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            points: user.points,
            vipLevel: user.vipLevel,
        },
        token,
        expiresIn: getTokenExpiresIn(),
    };
}

/**
 * 用户登录
 */
export async function login(identity: string, password: string, clientIp?: string): Promise<AuthResult> {
    // 1. 查找用户（支持邮箱、手机号、用户名）
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: identity },
                { phone: identity },
                { username: identity },
            ]
        }
    });

    if (!user) {
        throw new AuthError('USER_NOT_FOUND', '用户不存在');
    }

    // 2. 检查账户是否被锁定
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMs = user.lockedUntil.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new AuthError('ACCOUNT_LOCKED', `账户已锁定，请${remainingMin}分钟后重试`);
    }

    // 3. 检查账户状态
    if (user.status === UserStatus.DISABLED) {
        throw new AuthError('ACCOUNT_DISABLED', '账户已被禁用');
    }

    // 4. 验证密码
    if (!user.passwordHash) {
        throw new AuthError('INVALID_CREDENTIALS', '该账户未设置密码，请使用第三方登录');
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
        // 更新失败次数
        const newFailCount = user.loginFailCount + 1;
        const updateData: any = { loginFailCount: newFailCount };

        if (newFailCount >= LOCK_CONFIG.maxFailCount) {
            updateData.lockedUntil = new Date(Date.now() + LOCK_CONFIG.lockDurationMs);
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });

        throw new AuthError('INVALID_CREDENTIALS', '账号或密码错误');
    }

    // 5. 登录成功，重置失败次数
    await prisma.user.update({
        where: { id: user.id },
        data: {
            loginFailCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: clientIp || null,
        }
    });

    // 6. 签发 Token
    const token = signToken({ userId: user.id, role: user.role });

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            points: user.points,
            vipLevel: user.vipLevel,
        },
        token,
        expiresIn: getTokenExpiresIn(),
    };
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            nickname: true,
            avatar: true,
            bio: true,
            role: true,
            status: true,
            points: true,
            pointsUsed: true,
            vipLevel: true,
            vipExpiresAt: true,
            lastLoginAt: true,
            createdAt: true,
        }
    });

    if (!user) {
        throw new AuthError('USER_NOT_FOUND', '用户不存在');
    }

    return user;
}

/**
 * 发送密码重置验证码
 */
export async function forgotPassword(email: string): Promise<void> {
    // 1. 查找用户
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        // 为了安全，不透露用户是否存在
        console.log(`[Auth] 忘记密码请求 - 用户不存在: ${email}`);
        return;
    }

    // 2. 生成验证码
    const code = generateVerificationCode();
    const codeExp = new Date(Date.now() + CODE_EXPIRY_MS);

    // 3. 保存验证码
    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetCode: code,
            resetCodeExp: codeExp,
        }
    });

    // 4. 发送邮件（开发模式打印到控制台）
    if (process.env.MAIL_DEV_MODE === '1') {
        console.log(`[Auth] ========== 密码重置验证码 ==========`);
        console.log(`[Auth] 邮箱: ${email}`);
        console.log(`[Auth] 验证码: ${code}`);
        console.log(`[Auth] 有效期: 10 分钟`);
        console.log(`[Auth] =======================================`);
    } else {
        // TODO: 生产环境发送邮件
        // await sendResetEmail(email, code);
    }
}

/**
 * 重置密码
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    // 1. 验证密码强度
    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
        throw new AuthError('WEAK_PASSWORD', passwordCheck.message || '密码强度不足');
    }

    // 2. 查找用户
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new AuthError('USER_NOT_FOUND', '用户不存在');
    }

    // 3. 验证验证码
    if (!user.resetCode || user.resetCode !== code) {
        throw new AuthError('INVALID_CODE', '验证码错误');
    }

    if (!user.resetCodeExp || user.resetCodeExp < new Date()) {
        throw new AuthError('CODE_EXPIRED', '验证码已过期');
    }

    // 4. 更新密码
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetCode: null,
            resetCodeExp: null,
            loginFailCount: 0,
            lockedUntil: null,
        }
    });
}

/**
 * 修改密码（已登录用户）
 */
export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // 1. 验证新密码强度
    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
        throw new AuthError('WEAK_PASSWORD', passwordCheck.message || '密码强度不足');
    }

    // 2. 获取用户
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || !user.passwordHash) {
        throw new AuthError('USER_NOT_FOUND', '用户不存在');
    }

    // 3. 验证旧密码
    const oldPasswordValid = await comparePassword(oldPassword, user.passwordHash);
    if (!oldPasswordValid) {
        throw new AuthError('INVALID_CREDENTIALS', '原密码错误');
    }

    // 4. 更新密码
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
    });
}

/**
 * 更新用户资料
 */
export async function updateProfile(userId: string, data: UpdateProfileDto): Promise<any> {
    const updateData: any = {};
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.bio !== undefined) updateData.bio = data.bio;

    if (Object.keys(updateData).length === 0) {
        return await getCurrentUser(userId);
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            nickname: true,
            avatar: true,
            bio: true,
            role: true,
            status: true,
            points: true,
            pointsUsed: true,
            vipLevel: true,
            vipExpiresAt: true,
            lastLoginAt: true,
            createdAt: true,
        }
    });

    return user;
}
