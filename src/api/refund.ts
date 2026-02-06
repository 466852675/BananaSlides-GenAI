import { client } from './client';

export interface RefundEligibility {
    eligible: boolean;
    reason?: string;
    orderId: string;
    productName: string;
    finalPrice: number;
    paidAt: string;
    daysSincePayment: number;
    hasCreatedProjects: boolean;
}

export interface RefundRequest {
    id: string;
    orderId: string;
    orderNo: string;
    productName: string;
    amount: number;
    reason: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'MANUAL_REQUIRED';
    adminNote?: string;
    createdAt: string;
    processedAt?: string;
}

export interface RefundListResponse {
    items: RefundRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface RefundStats {
    totalRefunds: number;
    pendingRefunds: number;
    completedRefunds: number;
    rejectedRefunds: number;
    totalAmount: number;
    todayRefunds: number;
}

export interface AdminRefundFilters {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export async function checkRefundEligibility(orderId: string): Promise<RefundEligibility> {
    const res = await client.get(`/refunds/orders/${orderId}/eligibility`) as any;
    return res.data;
}

export async function applyRefund(orderId: string, reason: string): Promise<{ refundId: string; message: string }> {
    const res = await client.post(`/refunds/orders/${orderId}/apply`, { reason }) as any;
    return res.data;
}

export async function getMyRefunds(page = 1, limit = 10): Promise<RefundListResponse> {
    const res = await client.get('/refunds/my', { params: { page, limit } }) as any;
    return res.data;
}

export async function getRefundDetail(refundId: string): Promise<RefundRequest> {
    const res = await client.get(`/refunds/${refundId}`) as any;
    return res.data;
}

export async function getRefundStats(): Promise<RefundStats> {
    const res = await client.get('/admin/refunds/stats') as any;
    return res.data;
}

export async function getAdminRefunds(filters: AdminRefundFilters = {}): Promise<RefundListResponse> {
    const res = await client.get('/admin/refunds', { params: filters }) as any;
    return res.data;
}

export async function auditRefund(
    refundId: string,
    action: 'approve' | 'reject',
    adminNote?: string
): Promise<{ success: boolean; message: string; refund?: RefundRequest }> {
    const res = await client.post(`/admin/refunds/${refundId}/audit`, { action, adminNote }) as any;
    return res.data;
}

export async function getAdminRefundDetail(refundId: string): Promise<RefundRequest> {
    const res = await client.get(`/admin/refunds/${refundId}`) as any;
    return res.data;
}
