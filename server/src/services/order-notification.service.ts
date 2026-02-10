// server/src/services/order-notification.service.ts
// 订单相关通知服务

import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';
import { renderTemplate } from './message-template.service';

interface OrderContext {
    orderId: string;
    userId: string;
    orderNo: string;
    productName: string;
    points: number;
    amount: number;
}

/**
 * 发送订单支付成功通知
 */
export async function notifyOrderPaid(ctx: OrderContext) {
    try {
        // 尝试使用模板渲染
        try {
            const template = await renderTemplate({
                code: 'ORDER_PAID',
                variables: {
                    orderNo: ctx.orderNo,
                    points: ctx.points,
                    productName: ctx.productName,
                    amount: ctx.amount.toFixed(2),
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.ORDER,
                title: template.title,
                content: template.content,
                summary: `${ctx.productName}，+${ctx.points} 积分`,
                bizType: 'order',
                bizId: ctx.orderId,
                actionUrl: `/user/orders?id=${ctx.orderId}`,
                isImportant: true,
            });
        } catch {
            // 模板不存在时使用默认内容
            await createMessage({
                userId: ctx.userId,
                type: MessageType.ORDER,
                title: '订单支付成功',
                content: `您的订单 ${ctx.orderNo} 已支付成功！已到账 ${ctx.points} 积分，感谢您的支持。`,
                summary: `${ctx.productName}，+${ctx.points} 积分`,
                bizType: 'order',
                bizId: ctx.orderId,
                actionUrl: `/user/orders?id=${ctx.orderId}`,
                isImportant: true,
            });
        }
    } catch (error) {
        console.error('[OrderNotification] 发送订单支付成功通知失败:', error);
    }
}

/**
 * 发送订单创建通知（待支付）
 */
export async function notifyOrderCreated(ctx: OrderContext) {
    try {
        // 尝试使用模板渲染
        try {
            const template = await renderTemplate({
                code: 'ORDER_CREATED',
                variables: {
                    orderNo: ctx.orderNo,
                    productName: ctx.productName,
                    amount: ctx.amount.toFixed(2),
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.ORDER,
                title: template.title,
                content: template.content,
                summary: `待支付：¥${ctx.amount}`,
                bizType: 'order',
                bizId: ctx.orderId,
                actionUrl: `/user/orders?id=${ctx.orderId}`,
            });
        } catch {
            // 模板不存在时使用默认内容
            await createMessage({
                userId: ctx.userId,
                type: MessageType.ORDER,
                title: '订单已创建',
                content: `您的订单 ${ctx.orderNo} 已创建，请尽快完成支付。商品：${ctx.productName}，金额：¥${ctx.amount}`,
                summary: `待支付：¥${ctx.amount}`,
                bizType: 'order',
                bizId: ctx.orderId,
                actionUrl: `/user/orders?id=${ctx.orderId}`,
            });
        }
    } catch (error) {
        console.error('[OrderNotification] 发送订单创建通知失败:', error);
    }
}

/**
 * 发送订单支付失败通知
 */
export async function notifyOrderFailed(ctx: OrderContext) {
    try {
        // 尝试使用模板渲染
        try {
            const template = await renderTemplate({
                code: 'ORDER_FAILED',
                variables: {
                    orderNo: ctx.orderNo,
                    productName: ctx.productName,
                    amount: ctx.amount.toFixed(2),
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.ORDER,
                title: template.title,
                content: template.content,
                summary: `支付失败：${ctx.productName}`,
                bizType: 'order',
                bizId: ctx.orderId,
                actionUrl: `/user/orders?id=${ctx.orderId}`,
                isImportant: true,
            });
        } catch {
            // 模板不存在时使用默认内容
            await createMessage({
                userId: ctx.userId,
                type: MessageType.ORDER,
                title: '订单支付失败',
                content: `您的订单 ${ctx.orderNo} 支付失败，请重新尝试或联系客服。`,
                summary: `支付失败：${ctx.productName}`,
                bizType: 'order',
                bizId: ctx.orderId,
                actionUrl: `/user/orders?id=${ctx.orderId}`,
                isImportant: true,
            });
        }
    } catch (error) {
        console.error('[OrderNotification] 发送订单支付失败通知失败:', error);
    }
}
