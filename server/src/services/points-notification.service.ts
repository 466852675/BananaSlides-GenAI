// server/src/services/points-notification.service.ts
// 积分变动通知服务

import { MessageType } from '../types/user.types';
import { createMessage } from './message.service';

interface CheckInRewardContext {
    userId: string;
    points: number;
    streak: number;
}

interface ReferralRewardContext {
    userId: string;
    points: number;
    referredNickname: string;
}

/**
 * 签到获得积分通知
 */
export async function notifyCheckInReward(ctx: CheckInRewardContext) {
    const streakText = ctx.streak > 1 ? `（连签 ${ctx.streak} 天）` : '';
    await createMessage({
        userId: ctx.userId,
        type: MessageType.POINTS,
        title: '✅ 签到成功',
        content: `每日签到获得 ${ctx.points} 积分${streakText}，继续保持签到解锁更多奖励！`,
        summary: `+${ctx.points} 积分`,
        bizType: 'points_checkin',
        actionUrl: '/user/profile',
        isImportant: false,
    });
}

/**
 * 邀请好友获得积分通知
 */
export async function notifyReferralReward(ctx: ReferralRewardContext) {
    await createMessage({
        userId: ctx.userId,
        type: MessageType.POINTS,
        title: '🎁 邀请奖励到账',
        content: `您邀请的好友 ${ctx.referredNickname} 已注册成功，获得 ${ctx.points} 积分奖励！`,
        summary: `+${ctx.points} 积分`,
        bizType: 'points_referral',
        actionUrl: '/user/invite',
        isImportant: false,
    });
}
