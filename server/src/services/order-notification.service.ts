// server/src/services/order-notification.service.ts
// 订单相关通知服务

import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';

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
    await createMessage({
        userId: ctx.userId,
        type: MessageType.ORDER,
        title: '订单支付成功',
        content: `您的订单 ${ctx.orderNo} 已支付成功！已到账 ${ctx.points} 积分，感谢您的支持。`,
        summary: `${ctx.productName}，+${ctx.points} 积分`,
        bizType: 'order',
        bizId: ctx.orderId,
        actionUrl: `/orders/${ctx.orderId}`,
        isImportant: true,
    });
}

/**
 * 发送订单创建通知（待支付）
 */
export async function notifyOrderCreated(ctx: OrderContext) {
    await createMessage({
        userId: ctx.userId,
        type: MessageType.ORDER,
        title: '订单已创建',
        content: `您的订单 ${ctx.orderNo} 已创建，请尽快完成支付。商品：${ctx.productName}，金额：¥${ctx.amount}`,
        summary: `待支付：¥${ctx.amount}`,
        bizType: 'order',
        bizId: ctx.orderId,
        actionUrl: `/orders/${ctx.orderId}`,
    });
}

/**
 * 发送订单支付失败通知
 */
export async function notifyOrderFailed(ctx: OrderContext) {
    await createMessage({
        userId: ctx.userId,
        type: MessageType.ORDER,
        title: '订单支付失败',
        content: `您的订单 ${ctx.orderNo} 支付失败，请重新尝试或联系客服。`,
        summary: `支付失败：${ctx.productName}`,
        bizType: 'order',
        bizId: ctx.orderId,
        actionUrl: `/orders/${ctx.orderId}`,
        isImportant: true,
    });
}
