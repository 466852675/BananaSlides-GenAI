// src/api/orders.ts
// 订单 API：创建订单、支付模拟、订单查询

import { client } from './client';

export interface CreateOrderResponse {
    orderId: string;
    orderNo: string;
    status: string;
    productName: string;
    finalPrice: number;
    points: number;
}

export interface PayOrderResponse {
    success: boolean;
    message: string;
    newBalance?: number;
}

export interface Order {
    id: string;
    orderNo: string;
    productType: string;
    productName: string;
    quantity: number;
    originalPrice: number;
    finalPrice: number;
    status: string;
    createdAt: string;
    fulfillmentAt?: string;
}

export interface OrderListResponse {
    items: Order[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/**
 * 创建订单
 * @param productId 产品 ID
 * @param paymentMethod 支付方式 (可选)
 */
export async function createOrder(productId: string, paymentMethod?: string): Promise<CreateOrderResponse> {
    const res = await client.post('/orders', { productId, paymentMethod }) as any;
    return res.data;
}

/**
 * 模拟支付
 * @param orderId 订单 ID
 * @param simulate 模拟结果: 'success' | 'fail' (默认 'success')
 * @param paymentMethod 支付方式 (可选)
 */
export async function payOrder(orderId: string, simulate: 'success' | 'fail' = 'success', paymentMethod?: string): Promise<PayOrderResponse> {
    const res = await client.post(`/orders/${orderId}/pay`, { simulate, paymentMethod }) as any;
    return res.data;
}

/**
 * 取消订单
 * @param orderId 订单 ID
 */
export async function cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const res = await client.post(`/orders/${orderId}/cancel`) as any;
    return res.data;
}

/**
 * 获取我的订单列表
 */
export async function getMyOrders(page = 1, limit = 10): Promise<OrderListResponse> {
    const res = await client.get('/orders/my', { params: { page, limit } }) as any;
    return res.data;
}
