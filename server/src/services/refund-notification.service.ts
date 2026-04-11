import { MessageType } from '../types/user.types';
import { createMessage } from './message.service';
import { renderTemplate } from './message-template.service';
import { prisma } from '../db';

export interface RefundMessageContext {
    userId: string;
    refundId: string;
    refundNo: string;
    orderNo: string;
    amount: number;
    productName: string;
    reason?: string;
    remark?: string;
    transactionId?: string;
}

export async function sendRefundSubmittedMessage(ctx: RefundMessageContext) {
    try {
        try {
            const template = await renderTemplate({
                code: 'REFUND_SUBMITTED',
                variables: {
                    refundNo: ctx.refundNo,
                    amount: ctx.amount.toFixed(2),
                    productName: ctx.productName,
                    orderNo: ctx.orderNo,
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: template.title,
                content: template.content,
                summary: `退款单号: ${ctx.refundNo}, 金额: ¥${ctx.amount}`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        } catch {
            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: '退款申请已提交',
                content: `您的退款申请已提交成功，请等待审核。\n\n退款单号: ${ctx.refundNo}\n订单编号: ${ctx.orderNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n商品名称: ${ctx.productName}\n\n我们会在1-3个工作日内完成审核，请耐心等待。`,
                summary: `退款单号: ${ctx.refundNo}, 金额: ¥${ctx.amount}`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款提交通知失败:', error);
    }
}

export async function sendRefundApprovedMessage(ctx: RefundMessageContext) {
    try {
        try {
            const template = await renderTemplate({
                code: 'REFUND_APPROVED',
                variables: {
                    refundNo: ctx.refundNo,
                    amount: ctx.amount.toFixed(2),
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: template.title,
                content: template.content,
                summary: `退款单号: ${ctx.refundNo} 已通过审核`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        } catch {
            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: '退款申请已通过审核',
                content: `您的退款申请已通过审核，退款将在1-3个工作日内退回原支付账户。\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n\n请注意查收您的账户余额。`,
                summary: `退款单号: ${ctx.refundNo} 已通过审核`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款通过通知失败:', error);
    }
}

export async function sendRefundRejectedMessage(ctx: RefundMessageContext) {
    try {
        const remarkText = ctx.remark || '';

        try {
            const template = await renderTemplate({
                code: 'REFUND_REJECTED',
                variables: {
                    refundNo: ctx.refundNo,
                    amount: ctx.amount.toFixed(2),
                    remark: remarkText,
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: template.title,
                content: template.content,
                summary: `退款单号: ${ctx.refundNo} 未通过审核`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        } catch {
            const remarkDisplay = remarkText ? `\n拒绝原因: ${remarkText}` : '';
            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: '退款申请未通过审核',
                content: `您的退款申请未通过审核。${remarkDisplay}\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n\n如有疑问，请联系客服。`,
                summary: `退款单号: ${ctx.refundNo} 未通过审核`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款拒绝通知失败:', error);
    }
}

export async function sendRefundCompletedMessage(ctx: RefundMessageContext) {
    try {
        const transactionText = ctx.transactionId || '';

        try {
            const template = await renderTemplate({
                code: 'REFUND_COMPLETED',
                variables: {
                    refundNo: ctx.refundNo,
                    amount: ctx.amount.toFixed(2),
                    transactionId: transactionText,
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: template.title,
                content: template.content,
                summary: `退款单号: ${ctx.refundNo} 已成功到账`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        } catch {
            const transactionDisplay = transactionText ? `\n交易流水号: ${transactionText}` : '';
            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: '退款已成功到账',
                content: `您的退款已成功退回至您的支付账户。\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}${transactionDisplay}\n\n请注意查收您的账户余额。`,
                summary: `退款单号: ${ctx.refundNo} 已成功到账`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款完成通知失败:', error);
    }
}

export async function sendRefundFailedMessage(ctx: RefundMessageContext) {
    try {
        const reasonText = ctx.remark || '';

        try {
            const template = await renderTemplate({
                code: 'REFUND_FAILED',
                variables: {
                    refundNo: ctx.refundNo,
                    amount: ctx.amount.toFixed(2),
                    reason: reasonText,
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: template.title,
                content: template.content,
                summary: `退款单号: ${ctx.refundNo} 处理失败`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
                isImportant: true,
            });
        } catch {
            const reasonDisplay = reasonText ? `\n失败原因: ${reasonText}` : '';
            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: '退款处理失败',
                content: `您的退款处理失败，请联系客服处理。${reasonDisplay}\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n\n请联系客服: support@bananaslides.com`,
                summary: `退款单号: ${ctx.refundNo} 处理失败`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds?id=${ctx.refundId}`,
                isImportant: true,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款失败通知失败:', error);
    }
}

export interface ExceptionAlertContext {
    refundId: string;
    refundNo: string;
    orderNo: string;
    amount: number;
    userName: string;
    exceptionType: string;
    exceptionMessage: string;
    createdAt: Date;
}

export async function sendRefundExceptionAlert(ctx: ExceptionAlertContext) {
    try {
        const { ExceptionType } = await import('./refund-exception.service');
        const typeLabel = ctx.exceptionType in ExceptionType 
            ? ExceptionType[ctx.exceptionType as keyof typeof ExceptionType] 
            : ctx.exceptionType;
        
        const adminIds = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { id: true }
        });

        for (const admin of adminIds) {
            await createMessage({
                userId: admin.id,
                type: MessageType.SYSTEM,
                title: '退款异常告警',
                content: `退款单需要人工处理\n\n退款单号: ${ctx.refundNo}\n订单编号: ${ctx.orderNo}\n用户: ${ctx.userName}\n金额: ¥${ctx.amount.toFixed(2)}\n异常类型: ${typeLabel}\n异常信息: ${ctx.exceptionMessage}\n申请时间: ${ctx.createdAt.toLocaleString('zh-CN')}\n\n请尽快前往退款管理页面处理。`,
                summary: `退款 ${ctx.refundNo} 异常: ${typeLabel}`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/admin/refunds?id=${ctx.refundId}`,
                isImportant: true,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款异常告警失败:', error);
    }
}

export const RefundNotificationService = {
    sendRefundSubmittedMessage,
    sendRefundApprovedMessage,
    sendRefundRejectedMessage,
    sendRefundCompletedMessage,
    sendRefundFailedMessage,
    sendRefundExceptionAlert,
};

export default RefundNotificationService;
