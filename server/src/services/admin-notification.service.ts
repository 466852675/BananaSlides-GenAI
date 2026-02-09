
import { MessageType, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { createMessage } from './message.service';

/**
 * 管理员通知服务
 * 用于向管理员发送关键业务事件通知
 */

/**
 * 获取所有管理员ID
 */
async function getAdminIds(): Promise<string[]> {
    const admins = await prisma.user.findMany({
        where: {
            role: {
                in: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
            },
            status: 'ACTIVE'
        },
        select: { id: true }
    });
    return admins.map(a => a.id);
}

/**
 * 通知管理员：新订单
 */
export async function notifyAdminNewOrder(order: {
    id: string;
    orderNo: string;
    finalPrice: number;
    productName: string;
    user?: { nickname: string | null; email: string };
    userId: string;
}) {
    try {
        const adminIds = await getAdminIds();
        if (adminIds.length === 0) return;

        const userName = order.user?.nickname || order.user?.email || '用户';

        await Promise.all(adminIds.map(adminId =>
            createMessage({
                userId: adminId,
                type: MessageType.ORDER,
                title: '💰 新订单入账',
                content: `用户 ${userName} 购买了 ${order.productName}，金额 ¥${order.finalPrice}`,
                summary: `入账: ¥${order.finalPrice}`,
                bizType: 'admin_order',
                bizId: order.id,
                actionUrl: '/admin/orders',
                isImportant: order.finalPrice > 100 // 大额订单标记为重要
            })
        ));
    } catch (error) {
        console.error('[AdminNotify] 发送新订单通知失败:', error);
    }
}

/**
 * 通知管理员：新退款申请
 */
export async function notifyAdminNewRefund(refund: {
    id: string;
    refundNo: string;
    amount: number;
    reason: string;
    orderId: string;
}) {
    try {
        const adminIds = await getAdminIds();
        if (adminIds.length === 0) return;

        await Promise.all(adminIds.map(adminId =>
            createMessage({
                userId: adminId,
                type: MessageType.REFUND,
                title: '⚠️ 新退款申请待审核',
                content: `收到一笔新的退款申请。\n单号: ${refund.refundNo}\n金额: ¥${refund.amount}\n原因: ${refund.reason}`,
                summary: `待审核: ¥${refund.amount}`,
                bizType: 'admin_refund',
                bizId: refund.id,
                actionUrl: '/admin/orders?tab=refunds',
                isImportant: true
            })
        ));
    } catch (error) {
        console.error('[AdminNotify] 发送退款申请通知失败:', error);
    }
}

/**
 * 通知管理员：新线索
 */
export async function notifyAdminNewLead(lead: {
    id: string;
    name: string;
    company?: string | null; // Allow null
    phone?: string | null;   // Allow null
    industry?: string | null; // Allow null
    needs?: string | null;    // Allow null
}) {
    try {
        const adminIds = await getAdminIds();
        if (adminIds.length === 0) return;

        const companyInfo = lead.company ? `\n公司: ${lead.company}` : '';
        const phoneInfo = lead.phone ? `\n电话: ${lead.phone}` : '';

        await Promise.all(adminIds.map(adminId =>
            createMessage({
                userId: adminId,
                type: MessageType.SYSTEM, // 使用 SYSTEM 类型，直到添加 LEAD 类型
                title: '📈 收到新销售线索',
                content: `有新的潜在客户提交了信息。${companyInfo}\n联系人: ${lead.name}${phoneInfo}`,
                summary: `新线索: ${lead.name}`,
                bizType: 'admin_lead',
                bizId: lead.id,
                actionUrl: '/admin/users?tab=leads',
                isImportant: false
            })
        ));
    } catch (error) {
        console.error('[AdminNotify] 发送新线索通知失败:', error);
    }
}

export const AdminNotificationService = {
    notifyAdminNewOrder,
    notifyAdminNewRefund,
    notifyAdminNewLead
};

export default AdminNotificationService;
