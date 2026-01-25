
export class QuotaService {
    getDefaultLimit(type: string, isPro: boolean): number {
        // Simple default implementation based on requirements
        // user: 5 projects, pro: 50 projects? or as per business logic
        if (type === 'project_count') {
            return isPro ? 100 : 5;
        }
        return 0;
    }
}

export const quotaService = new QuotaService();
