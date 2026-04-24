// server/src/services/auth.service.ts
// 认证服务：注册、登录、密码重置

import { UserRole, UserStatus } from '../types/user.types';
import {
    hashPassword,
    comparePassword,
    validatePasswordStrength,
    generateVerificationCode
} from '../utils/password.util';
import { signToken, getTokenExpiresIn } from '../utils/jwt.util';
import { SettingService } from './setting.service';
import { prisma } from '../db';
import crypto from 'crypto';
import { notifyLoginSuccess, notifyPasswordChanged } from './security-notification.service';
import { notifyWelcome } from './activity-notification.service';

// 生成唯一邀请码
function generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

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
    inviteCode?: string; // 邀请码（可选）
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
        role: string;
        points: number;
        vipLevel: number;
        inviteCode?: string | null;
        [key: string]: any;
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

    // 4. 查找邀请人（如果提供了邀请码）
    let inviter: { id: string; points: number } | null = null;
    if (data.inviteCode) {
        inviter = await prisma.user.findUnique({
            where: { inviteCode: data.inviteCode },
            select: { id: true, points: true }
        });
        // 如果邀请码无效，不阻止注册，只是不绑定
        if (!inviter) {
            console.log(`[Auth] 无效的邀请码: ${data.inviteCode}`);
        }
    }

    // 5. 读取配置（新用户赠送积分、邀请奖励积分）
    const settings = await SettingService.getSettings();
    const basePoints = parseInt(settings?.NEW_USER_POINTS || '30', 10);
    const referralRewardPoints = parseInt(settings?.REFERRAL_POINTS || '200', 10);

    // 6. 创建用户（新用户基础积分 + 被邀请奖励）
    const passwordHash = await hashPassword(data.password);
    const newInviteCode = generateInviteCode();
    const totalPoints = basePoints + (inviter ? referralRewardPoints : 0);

    const user = await prisma.user.create({
        data: {
            email: data.email,
            passwordHash,
            nickname: data.nickname || data.email.split('@')[0],
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            points: totalPoints,
            inviteCode: newInviteCode,
            invitedById: inviter?.id, // 绑定邀请人
        }
    });

    // 7. 签发 Token
    const token = signToken({ userId: user.id, role: user.role });

    // 8. 创建赠送积分的交易记录
    await prisma.transaction.create({
        data: {
            userId: user.id,
            type: 'bonus',
            amount: basePoints,
            balance: totalPoints,
            description: '新用户注册赠送',
        }
    });

    // 9. 如果有有效邀请人，双方获得奖励
    if (inviter) {
        // 被邀请人获得奖励记录
        await prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'bonus',
                amount: referralRewardPoints,
                balance: totalPoints,
                description: '受邀注册奖励',
            }
        });

        // 邀请人获得奖励
        const inviterNewPoints = inviter.points + referralRewardPoints;
        await prisma.user.update({
            where: { id: inviter.id },
            data: { points: inviterNewPoints }
        });

        await prisma.transaction.create({
            data: {
                userId: inviter.id,
                type: 'bonus',
                amount: referralRewardPoints,
                balance: inviterNewPoints,
                description: `邀请用户 ${user.nickname || user.email} 注册奖励`,
            }
        });

        console.log(`[Auth] 邀请奖励已发放: 邀请人 ${inviter.id} 和新用户 ${user.id} 各获得 ${referralRewardPoints} 积分`);
    }

    // 10. 发送欢迎通知
    notifyWelcome({ userId: user.id, nickname: user.nickname || '' }).catch(() => { });

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            points: user.points,
            pointsUsed: user.pointsUsed,
            vipLevel: user.vipLevel,
            vipExpiresAt: user.vipExpiresAt,
            inviteCode: user.inviteCode,
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
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
        throw new AuthError('INVALID_CREDENTIALS', '该账户未设置有效密码，请尝试重置密码或使用第三方登录');
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

    // 7. 发送登录安全通知
    notifyLoginSuccess({ userId: user.id, ip: clientIp, method: 'password' }).catch(() => { });

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            points: user.points,
            pointsUsed: user.pointsUsed,
            vipLevel: user.vipLevel,
            vipExpiresAt: user.vipExpiresAt,
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
            inviteCode: true, // 返回邀请码
        }
    });

    if (!user) {
        throw new AuthError('USER_NOT_FOUND', '用户不存在');
    }

    // 如果用户没有邀请码，自动生成一个
    if (!user.inviteCode) {
        const inviteCode = generateInviteCode();
        await prisma.user.update({
            where: { id: userId },
            data: { inviteCode }
        });
        return { ...user, inviteCode };
    }

    return user;
}

/**
 * 刷新用户 Token
 */
export async function refreshUserToken(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true }
    });

    if (!user) {
        throw new AuthError('USER_NOT_FOUND', '用户不存在');
    }

    if (user.status === UserStatus.DISABLED) {
        throw new AuthError('ACCOUNT_DISABLED', '账户已被禁用');
    }

    return signToken({
        userId: user.id,
        role: user.role
    });
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

    // 发送密码修改安全通知
    notifyPasswordChanged({ userId }).catch(() => { });
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

    // 检查是否是首次绑定手机号
    let shouldRewardPhone = false;
    if (data.phone !== undefined) {
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true, points: true }
        });
        // 如果之前没有手机号，且现在绑定了手机号，则赠送积分
        if (existingUser && !existingUser.phone && data.phone) {
            shouldRewardPhone = true;
        }
    }

    // 使用事务更新用户资料和赠送积分
    const result = await prisma.$transaction(async (tx) => {
        // 更新用户资料
        const user = await tx.user.update({
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

        // 保护头像资源，防止被清理服务删除
        if (data.avatar && data.avatar.startsWith('/uploads/')) {
            const avatarAsset = await tx.assetRegistry.findFirst({
                where: { url: data.avatar, status: 'ACTIVE' }
            });
            if (avatarAsset) {
                await tx.assetRegistry.update({
                    where: { id: avatarAsset.id },
                    data: { isReferenced: true }
                });
            }
        }

        // 首次绑定手机号赠送积分
        if (shouldRewardPhone) {
            const settings = await SettingService.getSettings();
            const bindPhonePoints = parseInt(settings?.BIND_PHONE_POINTS || '50', 10);

            await tx.user.update({
                where: { id: userId },
                data: { points: { increment: bindPhonePoints } }
            });

            await tx.transaction.create({
                data: {
                    userId: userId,
                    type: 'bonus',
                    amount: bindPhonePoints,
                    balance: user.points + bindPhonePoints,
                    description: '绑定手机号奖励',
                    module: '增长',
                    category: '绑定手机'
                }
            });

            console.log(`[Auth] 用户 ${userId} 首次绑定手机号，赠送 ${bindPhonePoints} 积分`);

            // 返回更新后的用户信息
            return await tx.user.findUnique({
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
        }

        return user;
    });

    return result;
}

/**
 * 发送手机验证码 (模拟)
 */
export async function sendPhoneCode(phone: string): Promise<void> {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        throw new AuthError('INVALID_PHONE', '手机号格式错误');
    }

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + CODE_EXPIRY_MS);

    // 查找或预创建用户
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        // 读取新用户赠送积分配置
        const settings = await SettingService.getSettings();
        const newUserPoints = parseInt(settings?.NEW_USER_POINTS || '30', 10);

        const inviteCode = generateInviteCode();
        user = await prisma.user.create({
            data: {
                phone,
                nickname: `用户${phone.slice(-4)}`,
                points: newUserPoints,
                role: UserRole.USER,
                status: UserStatus.ACTIVE,
                inviteCode, // 自动生成邀请码
            }
        });

        // 发送注册奖励积分记录
        await prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'bonus',
                amount: newUserPoints,
                balance: newUserPoints,
                description: '手机号注册赠送',
            }
        });
    }

    // 借用 resetCode 字段存储登录验证码
    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetCode: code,
            resetCodeExp: expiry
        }
    });

    console.log(`[SMS MOCK] 验证码已发送至 ${phone}: ${code}`);
}

/**
 * 手机号验证码登录
 */
export async function loginWithPhone(phone: string, code: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || user.status === UserStatus.DISABLED) {
        throw new AuthError('ACCOUNT_DISABLED', '账户已被锁定或禁用');
    }

    if (!user.resetCode || user.resetCode !== code || !user.resetCodeExp || user.resetCodeExp < new Date()) {
        throw new AuthError('INVALID_CODE', '验证码错误或已过期');
    }

    // 登录成功，清除验证码
    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetCode: null,
            resetCodeExp: null,
            lastLoginAt: new Date(),
            loginFailCount: 0
        }
    });

    const token = signToken({ userId: user.id, role: user.role });

    // 发送手机登录安全通知
    notifyLoginSuccess({ userId: user.id, method: 'phone' }).catch(() => { });

    return {
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            points: user.points,
            pointsUsed: user.pointsUsed,
            vipLevel: user.vipLevel,
            vipExpiresAt: user.vipExpiresAt,
        },
        token,
        expiresIn: getTokenExpiresIn(),
    };
}

