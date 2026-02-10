// server/src/services/activity-notification.service.ts
// 活动运营通知服务

import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';

interface StreakMilestoneContext {
    userId: string;
    streak: number;
    bonusPoints: number;
}

interface WelcomeContext {
    userId: string;
    nickname: string;
}

/**
 * 签到连签里程碑通知
 */
export async function notifyStreakMilestone(ctx: StreakMilestoneContext) {
    const milestoneText = ctx.streak % 7 === 0 ? '7天' : '3天';
    await createMessage({
        userId: ctx.userId,
        type: MessageType.ACTIVITY,
        title: `🔥 连签 ${milestoneText} 达成！`,
        content: `恭喜您完成连续签到 ${ctx.streak} 天！额外获得 ${ctx.bonusPoints} 积分奖励，继续保持！`,
        summary: `连签${milestoneText}奖励 +${ctx.bonusPoints}`,
        bizType: 'activity_streak',
        actionUrl: '/user/profile',
        isImportant: false,
    });
}

/**
 * 新用户欢迎通知
 */
export async function notifyWelcome(ctx: WelcomeContext) {
    await createMessage({
        userId: ctx.userId,
        type: MessageType.ACTIVITY,
        title: '🎉 欢迎加入 BananaSlides！',
        content: `Hi ${ctx.nickname || '新用户'}，欢迎来到 BananaSlides AI 智能创作平台！每日签到可获取免费积分，快来体验 AI 一键生成 PPT 吧！`,
        summary: '新用户欢迎',
        bizType: 'activity_welcome',
        actionUrl: '/user/profile',
        isImportant: true,
    });
}
