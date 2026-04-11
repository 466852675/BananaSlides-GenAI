// server/src/services/vip-notification.service.ts
// VIP 等级变动通知服务

import { MessageType } from '../types/user.types';
import { createMessage } from './message.service';

const VIP_NAMES: Record<number, string> = {
    0: '免费用户',
    1: '基础版',
    2: '专业版',
    3: '高级版',
    4: '企业版',
};

interface VipChangeContext {
    userId: string;
    oldLevel: number;
    newLevel: number;
}

/**
 * 发送 VIP 等级变动通知
 */
export async function notifyVipChange(ctx: VipChangeContext) {
    const { userId, oldLevel, newLevel } = ctx;
    const isUpgrade = newLevel > oldLevel;
    const oldName = VIP_NAMES[oldLevel] || `VIP${oldLevel}`;
    const newName = VIP_NAMES[newLevel] || `VIP${newLevel}`;

    const title = isUpgrade ? '🎉 VIP 等级升级' : 'VIP 等级变更';
    const content = isUpgrade
        ? `恭喜！您已成功升级至 ${newName}，解锁更多高级功能与专属权益！`
        : `您的会员等级已变更为 ${newName}。如有疑问请联系客服。`;
    const summary = isUpgrade ? `${oldName} → ${newName}` : `等级变更：${newName}`;

    await createMessage({
        userId,
        type: MessageType.VIP,
        title,
        content,
        summary,
        bizType: 'vip',
        actionUrl: '/settings',
        isImportant: isUpgrade,
    });
}
