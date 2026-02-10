// server/src/services/security-notification.service.ts
// 安全相关通知服务

import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';

interface LoginNotifyContext {
    userId: string;
    ip?: string;
    method: 'password' | 'phone' | 'wechat';
}

interface PasswordChangeContext {
    userId: string;
}

/**
 * 发送登录成功通知
 */
export async function notifyLoginSuccess(ctx: LoginNotifyContext) {
    const methodMap: Record<string, string> = {
        password: '账号密码',
        phone: '手机验证码',
        wechat: '微信扫码',
    };
    const methodText = methodMap[ctx.method] || ctx.method;
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    await createMessage({
        userId: ctx.userId,
        type: MessageType.SECURITY,
        title: '🔐 登录提醒',
        content: `您于 ${time} 通过${methodText}方式登录了账号。如非本人操作，请立即修改密码。`,
        summary: `${methodText}登录`,
        bizType: 'security_login',
        actionUrl: '/user/profile',
        isImportant: false,
    });
}

/**
 * 发送密码修改成功通知
 */
export async function notifyPasswordChanged(ctx: PasswordChangeContext) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    await createMessage({
        userId: ctx.userId,
        type: MessageType.SECURITY,
        title: '🔑 密码已修改',
        content: `您的账号密码已于 ${time} 成功修改。如非本人操作请立即联系客服。`,
        summary: '密码修改成功',
        bizType: 'security_password',
        actionUrl: '/user/profile',
        isImportant: true,
    });
}
