import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';
import { renderTemplate } from './message-template.service';

/**
 * 退款消息通知服务
 * 在退款流程的各个节点发送消息通知用户
 */

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

/**
 * 发送退款申请提交通知
 */
export async function sendRefundSubmittedMessage(ctx: RefundMessageContext) {
    try {
        // 尝试使用模板渲染
        try {
            const template = await renderTemplate({
                code: 'REFUND_SUBMITTED',
                variables: {
                    refundNo: ctx.refundNo,
                    amount: ctx.amount,
                    productName: ctx.productName,
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
                actionUrl: `/user/refunds/${ctx.refundId}`,
            });
        } catch (templateError) {
            // 模板不存在时使用默认内容
            await createMessage({
                userId: ctx.userId,
                type: MessageType.REFUND,
                title: '退款申请已提交',
                content: `您的退款申请已提交成功，请等待审核。\n\n退款单号: ${ctx.refundNo}\n订单编号: ${ctx.orderNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n商品名称: ${ctx.productName}\n\n我们会在1-3个工作日内完成审核，请耐心等待。`,
                summary: `退款单号: ${ctx.refundNo}, 金额: ¥${ctx.amount}`,
                bizType: 'refund',
                bizId: ctx.refundId,
                actionUrl: `/user/refunds/${ctx.refundId}`,
            });
        }
    } catch (error) {
        console.error('[RefundNotification] 发送退款提交通知失败:', error);
    }
}

/**
 * 发送退款审核通过通知
 */
export async function sendRefundApprovedMessage(ctx: RefundMessageContext) {
    try {
        await createMessage({
            userId: ctx.userId,
            type: MessageType.REFUND,
            title: '退款申请已通过审核',
            content: `您的退款申请已通过审核，退款将在1-3个工作日内退回原支付账户。\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n\n请注意查收您的账户余额。`,
            summary: `退款单号: ${ctx.refundNo} 已通过审核`,
            bizType: 'refund',
            bizId: ctx.refundId,
            actionUrl: `/user/refunds/${ctx.refundId}`,
        });
    } catch (error) {
        console.error('[RefundNotification] 发送退款通过通知失败:', error);
    }
}

/**
 * 发送退款审核拒绝通知
 */
export async function sendRefundRejectedMessage(ctx: RefundMessageContext) {
    try {
        const remarkText = ctx.remark ? `\n拒绝原因: ${ctx.remark}` : '';

        await createMessage({
            userId: ctx.userId,
            type: MessageType.REFUND,
            title: '退款申请未通过审核',
            content: `您的退款申请未通过审核。${remarkText}\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n\n如有疑问，请联系客服。`,
            summary: `退款单号: ${ctx.refundNo} 未通过审核`,
            bizType: 'refund',
            bizId: ctx.refundId,
            actionUrl: `/user/refunds/${ctx.refundId}`,
        });
    } catch (error) {
        console.error('[RefundNotification] 发送退款拒绝通知失败:', error);
    }
}

/**
 * 发送退款完成通知
 */
export async function sendRefundCompletedMessage(ctx: RefundMessageContext) {
    try {
        const transactionText = ctx.transactionId ? `\n交易流水号: ${ctx.transactionId}` : '';

        await createMessage({
            userId: ctx.userId,
            type: MessageType.REFUND,
            title: '退款已成功到账',
            content: `您的退款已成功退回至您的支付账户。\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}${transactionText}\n\n请注意查收您的账户余额。`,
            summary: `退款单号: ${ctx.refundNo} 已成功到账`,
            bizType: 'refund',
            bizId: ctx.refundId,
            actionUrl: `/user/refunds/${ctx.refundId}`,
        });
    } catch (error) {
        console.error('[RefundNotification] 发送退款完成通知失败:', error);
    }
}

/**
 * 发送退款失败通知
 */
export async function sendRefundFailedMessage(ctx: RefundMessageContext) {
    try {
        const reasonText = ctx.remark ? `\n失败原因: ${ctx.remark}` : '';

        await createMessage({
            userId: ctx.userId,
            type: MessageType.REFUND,
            title: '退款处理失败',
            content: `您的退款处理失败，请联系客服处理。${reasonText}\n\n退款单号: ${ctx.refundNo}\n退款金额: ¥${ctx.amount.toFixed(2)}\n\n请联系客服: support@bananaslides.com`,
            summary: `退款单号: ${ctx.refundNo} 处理失败`,
            bizType: 'refund',
            bizId: ctx.refundId,
            actionUrl: `/user/refunds/${ctx.refundId}`,
            isImportant: true,
        });
    } catch (error) {
        console.error('[RefundNotification] 发送退款失败通知失败:', error);
    }
}

/**
 * 退款消息通知服务导出
 */
export const RefundNotificationService = {
    sendRefundSubmittedMessage,
    sendRefundApprovedMessage,
    sendRefundRejectedMessage,
    sendRefundCompletedMessage,
    sendRefundFailedMessage,
};

export default RefundNotificationService;
