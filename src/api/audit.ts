import { client } from './client';

export interface AuditLog {
    id: string;
    userId: string | null;
    type: string;
    content: string | null;
    reason: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata: string | null;
    ip: string | null;
    createdAt: string;
    user?: {
        id: string;
        email: string | null;
        nickname: string | null;
    } | null;
}

export interface AuditLogFilters {
    type?: string;
    severity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
    page?: number;
    limit?: number;
}

export interface AuditLogResponse {
    items: AuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const auditApi = {
    async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
        const params = new URLSearchParams();
        
        if (filters.type) params.append('type', filters.type);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.userId) params.append('userId', filters.userId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        
        const queryString = params.toString();
        const url = `/admin/audit-logs${queryString ? `?${queryString}` : ''}`;
        
        return client.get(url) as Promise<AuditLogResponse>;
    },

    async getAuditLogTypes(): Promise<string[]> {
        return ['ADMIN_LOGIN', 'ADMIN_ACTION', 'AI_ENGINE_UPDATE', 'POINTS_RULE_CHANGE', 'USER_STATUS_CHANGE', 'ORDER_REFUND', 'PERMISSION_CHANGE', 'CONTENT_VIOLATION', 'PROMPT_INJECTION', 'RATE_LIMIT', 'SUSPICIOUS_ACTIVITY'];
    }
};
