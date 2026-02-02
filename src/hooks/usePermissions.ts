import { useQuery } from '@tanstack/react-query';
import { client } from '../api/client';

/**
 * 获取当前用户所有权限
 */
export function usePermissions() {
    const { data: rolePermissions = [], isLoading } = useQuery({
        queryKey: ['admin', 'my-permissions'],
        queryFn: async () => {
            const response = await client.get('/admin/roles/my-permissions');
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000, // 5分钟缓存
    });

    /**
     * 检查是否有指定权限
     */
    const hasPermission = (code: string): boolean => {
        return rolePermissions.some(
            (rp: any) => rp.permission?.code === code
        );
    };

    /**
     * 检查是否有任一权限（OR逻辑）
     */
    const hasAnyPermission = (codes: string[]): boolean => {
        return codes.some(code => hasPermission(code));
    };

    /**
     * 检查是否有所有权限（AND逻辑）
     */
    const hasAllPermissions = (codes: string[]): boolean => {
        return codes.every(code => hasPermission(code));
    };

    return {
        permissions: rolePermissions,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
    };
}

export default usePermissions;
