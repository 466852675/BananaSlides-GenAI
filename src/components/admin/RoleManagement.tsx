import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield,
    Save,
    Check,
    AlertCircle,
    UserCog,
    Lock
} from 'lucide-react';
import {
    getRoles,
    getPermissions,
    getRolePermissions,
    updateRolePermissions,
    Role,
    Permission
} from '../../api/admin';

export const RoleManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
    const [isDirty, setIsDirty] = useState(false);

    // 1. 获取角色列表
    const { data: roles, isLoading: isLoadingRoles } = useQuery({
        queryKey: ['admin', 'roles'],
        queryFn: getRoles
    });

    // 2. 获取所有权限定义
    const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
        queryKey: ['admin', 'permissions'],
        queryFn: getPermissions
    });

    // 3. 获取当前选中角色的权限
    const { data: rolePermissions, isLoading: isLoadingRolePermissions } = useQuery({
        queryKey: ['admin', 'roles', selectedRole?.id, 'permissions'],
        queryFn: () => getRolePermissions(selectedRole!.id),
        enabled: !!selectedRole
    });

    // 4. 更新权限 Mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedRole) return;
            await updateRolePermissions(selectedRole.id, Array.from(selectedPermissionIds));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'roles', selectedRole?.id, 'permissions'] });
            setIsDirty(false);
            // 可以添加一个 Toast 提示
            alert('权限保存成功');
        },
        onError: (error: any) => {
            alert(`保存失败: ${error.message}`);
        }
    });

    // 当选中角色改变时，重置选中状态
    useEffect(() => {
        if (rolePermissions) {
            const ids = new Set(rolePermissions.map(rp => rp.permissionId));
            setSelectedPermissionIds(ids);
            setIsDirty(false);
        }
    }, [rolePermissions]);

    // 默认选中第一个角色
    useEffect(() => {
        if (roles && roles.length > 0 && !selectedRole) {
            setSelectedRole(roles[0]);
        }
    }, [roles]);

    const handleTogglePermission = (permissionId: string) => {
        if (!selectedRole || selectedRole.id === 'SUPER_ADMIN') return; // 超管权限不可编辑

        const newSet = new Set(selectedPermissionIds);
        if (newSet.has(permissionId)) {
            newSet.delete(permissionId);
        } else {
            newSet.add(permissionId);
        }
        setSelectedPermissionIds(newSet);
        setIsDirty(true);
    };

    const handleSelectRole = (role: Role) => {
        if (isDirty) {
            if (!confirm('当前更改未保存，确定要切换角色吗？')) return;
        }
        setSelectedRole(role);
    };

    // 按模块分组权限
    const permissionsByModule = React.useMemo(() => {
        if (!permissions) return {};
        const groups: Record<string, Permission[]> = {};
        permissions.forEach(p => {
            if (!groups[p.module]) groups[p.module] = [];
            groups[p.module].push(p);
        });
        return groups;
    }, [permissions]);

    if (isLoadingRoles || isLoadingPermissions) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserCog className="text-violet-600" size={20} />
                    角色列表
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {roles?.map(role => (
                        <button
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={`p-4 rounded-xl border text-left transition-all ${selectedRole?.id === role.id
                                    ? 'bg-violet-50 border-violet-500 ring-1 ring-violet-500'
                                    : 'bg-white border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`font-bold ${selectedRole?.id === role.id ? 'text-violet-700' : 'text-slate-700'}`}>
                                    {role.name}
                                </span>
                                {role.id === 'SUPER_ADMIN' && <Lock size={14} className="text-amber-500" />}
                            </div>
                            <p className="text-xs text-slate-500">{role.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {selectedRole && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Shield className="text-violet-600" size={20} />
                                权限配置 - {selectedRole.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {selectedRole.id === 'SUPER_ADMIN'
                                    ? '超级管理员拥有所有系统权限，不可修改'
                                    : '勾选相应的权限以授予该角色访问特定功能的权利'}
                            </p>
                        </div>

                        {selectedRole.id !== 'SUPER_ADMIN' && (
                            <button
                                onClick={() => updateMutation.mutate()}
                                disabled={!isDirty || updateMutation.isPending}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all ${isDirty
                                        ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {updateMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                    <Save size={18} />
                                )}
                                保存更改
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {Object.entries(permissionsByModule).map(([module, perms]) => (
                            <div key={module} className="mb-8 last:mb-0">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                    {module} 模块
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {perms.map(perm => {
                                        const isSelected = selectedRole.id === 'SUPER_ADMIN' || selectedPermissionIds.has(perm.id);
                                        return (
                                            <div
                                                key={perm.id}
                                                onClick={() => handleTogglePermission(perm.id)}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                                    } ${selectedRole.id === 'SUPER_ADMIN' ? 'cursor-default opacity-80' : ''}`}
                                            >
                                                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                                                        ? 'bg-blue-500 border-blue-500'
                                                        : 'bg-white border-slate-300'
                                                    }`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                                        {perm.name}
                                                    </div>
                                                    {perm.description && (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            {perm.description}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 font-mono mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                                                        {perm.code}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {(!permissions || permissions.length === 0) && (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-slate-500">暂无权限定义</p>
                                <p className="text-xs text-slate-400 mt-1">请先在数据库中配置 Permission 表数据</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
