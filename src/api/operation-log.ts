import { client } from './client';

export interface OperationLog {
    id: string;
    operatorId: string;
    operatorRole: string;
    module: string;
    action: string;
    targetType: string;
    targetId: string;
    description: string;
    beforeValue: string | null;
    afterValue: string | null;
    changes: string | null;
    ip: string;
    userAgent: string | null;
    success: boolean;
    errorMessage: string | null;
    createdAt: string;
    operator?: {
        id: string;
        email: string | null;
        nickname: string | null;
    };
}

export interface OperationLogFilters {
    operatorId?: string;
    module?: string;
    action?: string;
    targetType?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface OperationLogResponse {
    items: OperationLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface OperationLogStats {
    totalCount: number;
    successCount: number;
    failedCount: number;
    successRate: number;
    moduleStats: Array<{ module: string; _count: { module: number } }>;
    actionStats: Array<{ action: string; _count: { action: number } }>;
}

export const operationLogApi = {
    async getOperationLogs(filters: OperationLogFilters = {}): Promise<OperationLogResponse> {
        const params = new URLSearchParams();
        
        if (filters.operatorId) params.append('operatorId', filters.operatorId);
        if (filters.module) params.append('module', filters.module);
        if (filters.action) params.append('action', filters.action);
        if (filters.targetType) params.append('targetType', filters.targetType);
        if (filters.success !== undefined) params.append('success', String(filters.success));
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        
        const queryString = params.toString();
        const url = `/admin/operation-logs${queryString ? `?${queryString}` : ''}`;
        
        return client.get(url) as Promise<OperationLogResponse>;
    },

    async getOperationLogStats(startDate?: string, endDate?: string): Promise<OperationLogStats> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const queryString = params.toString();
        const url = `/admin/operation-logs/stats${queryString ? `?${queryString}` : ''}`;
        
        return client.get(url) as Promise<OperationLogStats>;
    }
};
