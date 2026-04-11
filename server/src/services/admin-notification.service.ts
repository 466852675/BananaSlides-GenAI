
import { MessageType, UserRole } from '../types/user.types';
import { prisma } from '../db';
import { createMessage } from './message.service';
import { renderTemplate } from './message-template.service';

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

        let title = '💰 新订单入账';
        let content = `用户 ${userName} 购买了 ${order.productName}，金额 ¥${order.finalPrice}`;

        try {
            const template = await renderTemplate({
                code: 'ADMIN_NEW_ORDER',
                variables: {
                    userName,
                    productName: order.productName,
                    amount: order.finalPrice.toFixed(2),
                    orderNo: order.orderNo,
                },
            });
            title = template.title;
            content = template.content;
        } catch {
            // 模板不存在时使用默认内容
        }

        await Promise.all(adminIds.map(adminId =>
            createMessage({
                userId: adminId,
                type: MessageType.ORDER,
                title,
                content,
                summary: `入账: ¥${order.finalPrice}`,
                bizType: 'admin_order',
                bizId: order.id,
                actionUrl: `/admin/orders?id=${order.id}`,
                isImportant: order.finalPrice > 100
            })
        ));
    } catch (error) {
        console.error('[AdminNotify] 发送新订单通知失败:', error);
    }
}

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

        let title = '⚠️ 新退款申请待审核';
        let content = `收到一笔新的退款申请。\n单号: ${refund.refundNo}\n金额: ¥${refund.amount}\n原因: ${refund.reason}`;

        try {
            const template = await renderTemplate({
                code: 'ADMIN_NEW_REFUND',
                variables: {
                    refundNo: refund.refundNo,
                    amount: refund.amount.toFixed(2),
                    reason: refund.reason,
                },
            });
            title = template.title;
            content = template.content;
        } catch {
            // 模板不存在时使用默认内容
        }

        await Promise.all(adminIds.map(adminId =>
            createMessage({
                userId: adminId,
                type: MessageType.REFUND,
                title,
                content,
                summary: `待审核: ¥${refund.amount}`,
                bizType: 'admin_refund',
                bizId: refund.id,
                actionUrl: `/admin/refunds?id=${refund.id}`,
                isImportant: true
            })
        ));
    } catch (error) {
        console.error('[AdminNotify] 发送退款申请通知失败:', error);
    }
}

export async function notifyAdminNewLead(lead: {
    id: string;
    name: string;
    company?: string | null;
    phone?: string | null;
    industry?: string | null;
    needs?: string | null;
}) {
    try {
        const adminIds = await getAdminIds();
        if (adminIds.length === 0) return;

        const companyInfo = lead.company ? `\n公司: ${lead.company}` : '';
        const phoneInfo = lead.phone ? `\n电话: ${lead.phone}` : '';

        let title = '📈 收到新销售线索';
        let content = `有新的潜在客户提交了信息。${companyInfo}\n联系人: ${lead.name}${phoneInfo}`;

        try {
            const template = await renderTemplate({
                code: 'ADMIN_NEW_LEAD',
                variables: {
                    name: lead.name,
                    company: lead.company || '',
                    phone: lead.phone || '',
                    industry: lead.industry || '',
                },
            });
            title = template.title;
            content = template.content;
        } catch {
            // 模板不存在时使用默认内容
        }

        await Promise.all(adminIds.map(adminId =>
            createMessage({
                userId: adminId,
                type: MessageType.LEAD,
                title,
                content,
                summary: `新线索: ${lead.name}`,
                bizType: 'lead',
                bizId: lead.id,
                actionUrl: `/admin/leads?id=${lead.id}`,
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
