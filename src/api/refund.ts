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
    refundNo: string;
    orderId: string;
    orderNo: string;
    productName: string;
    amount: number;
    reason: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'MANUAL_REQUIRED';
    remark?: string;
    createdAt: string;
    processedAt?: string;
    // 方案 A + 风险标签增强字段
    userNickname: string;
    userEmail: string;
    userRiskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    paymentMethod: 'wechat' | 'alipay';
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
    processingRefunds: number;
    completedRefunds: number;
    rejectedRefunds: number;
    failedRefunds: number;
    manualRequiredRefunds: number;
    totalAmount: number;
    todayRefunds: number;
}

export interface AdminRefundFilters {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    keyword?: string;
    minAmount?: number;
    maxAmount?: number;
    channel?: string;
    hasNote?: boolean;
    riskLevel?: string;
}

// 用户画像接口（用于 RefundUserCard 组件）
export interface RefundUserProfile {
    id: string;
    email?: string;
    nickname?: string;
    vipLevel: string;
    createdAt: string;
    totalOrders: number;
    totalSpent: number;
    refundCount: number;
}

// 审核记录项（用于 RefundTimeline 组件）
export interface RefundAuditItem {
    id: string;
    action: 'SUBMIT' | 'AUTO_APPROVE' | 'APPROVE' | 'REJECT' | 'PROCESS' | 'COMPLETE' | 'FAIL';
    operator: string;
    note?: string;
    createdAt: string;
}

// 风险评估（用于 RefundRiskBadge 组件）
export interface RefundRiskAssessment {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    factors: string[];
    autoApprove: boolean;
}

// 原始订单信息（用于 RefundOrderCard 组件）
export interface RefundOriginalOrder {
    id: string;
    orderNo: string;
    productName: string;
    productType: string;
    finalPrice: number;
    amount: number;
    paidAt: string;
    status: string;
    paymentMethod?: string;
}

// ============================================================
// [智能决策座舱] 聚合详情类型定义
// ============================================================

export interface AdminRefundDetailAggregated {
    // 基础退款信息
    refund: {
        id: string;
        refundNo: string;
        amount: number;
        status: string;
        reason: string;
        description?: string | null;
        remark?: string | null;
        createdAt: string;
        processedAt?: string | null;
        completedAt?: string | null;
        processedBy?: string | null;
    };

    // 订单信息
    order: {
        id: string;
        orderNo: string;
        productName: string;
        productType: string;
        finalPrice: number;
        status: string;
        paidAt?: string | null;
        createdAt: string;
        quantity: number;
    };

    // 用户画像
    userProfile: {
        id: string;
        email: string;
        nickname?: string | null;
        accountAgeDays: number;
        currentPoints: number;
        totalPointsUsed: number;
        vipLevel: number;
        vipExpiresAt?: string | null;
        riskScore: number;
    };

    // 退款历史统计
    refundHistory: {
        totalRequests: number;
        approvedCount: number;
        rejectedCount: number;
        userRiskScore: number;
        lastRequestAt?: string | null;
    };

    // 风险雷达
    riskRadar: {
        canAutoApprove: boolean;
        reason?: string;
        riskFactors: string[];
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };

    // 资产核销仪表盘
    equityAudit: {
        orderAmount: number;
        pointsGranted: number;
        totalConsumedPoints: number;
        consumedValue: number;
        suggestedRefundAmount: number;
        projectsCreatedAfterOrder: number;
    };

    // 行为特征溯源
    behaviorContext: {
        consumptionHistory: Array<{
            id: string;
            action?: string | null;
            description?: string | null;
            points: number;
            timestamp: string;
            projectId?: string | null;
        }>;
        last24hActivityCount: number;
        last24hConsumedPoints: number;
        hasHighFrequencyActivity: boolean;
    };

    // AI 智能建议
    aiSuggestion: {
        verdict: string;
        confidence: 'LOW' | 'MEDIUM' | 'HIGH';
        explanation: string;
    };

    // 审核记录（时光轴）
    auditHistory: RefundAuditItem[];
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
    approved: boolean,
    remark?: string
): Promise<{ success: boolean; message: string; refund?: RefundRequest }> {
    const res = await client.post(`/admin/refunds/${refundId}/audit`, { approved, remark }) as any;
    return res.data;
}

// 重新触发失败的退款
export async function retryRefund(refundId: string): Promise<{ success: boolean; message: string }> {
    const res = await client.post(`/admin/refunds/${refundId}/retry`) as any;
    return res.data;
}

// 同步支付平台退款状态
export async function syncRefundStatus(refundId: string): Promise<{ success: boolean; message: string; status: string }> {
    const res = await client.post(`/admin/refunds/${refundId}/sync`) as any;
    return res.data;
}

// [智能决策座舱] 管理员退款详情聚合接口
export async function getAdminRefundDetail(refundId: string): Promise<AdminRefundDetailAggregated> {
    const res = await client.get(`/admin/refunds/${refundId}`) as any;
    return res.data;
}

