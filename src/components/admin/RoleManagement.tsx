import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield,
    Save,
    Check,
    AlertCircle,
    UserCog,
    Lock,
    Briefcase,
    Gem,
    User,
    LayoutGrid,
    Settings
} from 'lucide-react';
import {
    getRoles,
    getPermissions,
    getRolePermissions,
    updateRolePermissions,
    Role as ApiRole,
    Permission
} from '../../api/admin';

// Defines the frontend view of roles, ensuring new roles are visible

// 模块中文名称映射
const MODULE_NAMES: Record<string, string> = {
    // 用户侧
    HISTORY: '项目管理 (History)',
    CREATION: '创作室 (Creation)',
    TEMPLATE: '模版间 (Template)',
    INVITE: '邀请推广 (Invite)',
    CHECKIN: '签到系统 (CheckIn)',
    BILLING: '充值消费 (Billing)',
    // 管理侧
    ADMIN: '系统访问',
    DASHBOARD: '控制台',
    USERS: '用户管理',
    ORDERS: '订单管理',
    PRODUCTS: '产品管理',
    LEADS: '销售线索',
    POINTS: '积分规则',
    ROLES: '角色权限',
    AI: '模型引擎',
    SETTINGS: '系统设置'
};

const USER_SIDE_MODULES = ['HISTORY', 'CREATION', 'TEMPLATE', 'INVITE', 'CHECKIN', 'BILLING'];

export const RoleManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedRole, setSelectedRole] = useState<ApiRole | null>(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');

    // 1. 获取角色列表
    const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
        queryKey: ['admin', 'roles'],
        queryFn: getRoles
    });

    // Merge backend roles with frontend definitions to ensure consistent UI for new roles
    const displayRoles = [
        { id: 'SUPER_ADMIN', name: '系统管理员 (Lv10)', description: '拥有系统所有权限及其最高管理权', icon: <Lock className="text-amber-500" size={24} />, color: 'amber' },
        { id: 'ADMIN', name: '业务管理员 (Lv9)', description: '负责日常业务运营与用户管理', icon: <Shield className="text-blue-500" size={24} />, color: 'blue' },
        { id: 'ENTERPRISE', name: '企业用户 (Lv4)', description: '享有企业级权益与高级功能', icon: <Briefcase className="text-indigo-500" size={24} />, color: 'indigo' },
        { id: 'PREMIUM', name: '尊享用户 (Lv3)', description: '高级订阅用户，解锁顶配 AI 能力', icon: <Gem className="text-amber-500" size={24} />, color: 'amber' },
        { id: 'PROFESSIONAL', name: '专业用户 (Lv2)', description: '解锁高级排版与高清输出能力', icon: <Gem className="text-violet-500" size={24} />, color: 'violet' },
        { id: 'BASIC', name: '基础用户 (Lv1)', description: '解锁基础 AI 生成与文档导出', icon: <User className="text-blue-500" size={24} />, color: 'blue' },
        { id: 'USER', name: '免费用户 (Lv0)', description: '基础功能限额使用权', icon: <User className="text-slate-500" size={24} />, color: 'slate' },
    ];

    // 2. 获取所有权限定义
    const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
        queryKey: ['admin', 'permissions'],
        queryFn: getPermissions
    });

    // 3. 获取当前选中角色的权限
    const { data: rolePermissions = [], isLoading: isLoadingRolePermissions } = useQuery({
        queryKey: ['admin', 'roles', selectedRole?.id, 'permissions'],
        queryFn: () => selectedRole ? getRolePermissions(selectedRole.id) : Promise.resolve([]),
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
            // Alert replaced with inline state or toast system if available
            alert('权限配置已保存 ✅');
        },
        onError: (error: any) => {
            alert(`保存失败: ${error.message}`);
        }
    });

    // 当选中角色改变书，重置选中状态
    useEffect(() => {
        if (rolePermissions) {
            const ids = new Set(rolePermissions.map(rp => rp.permissionId));
            setSelectedPermissionIds(ids);
            setIsDirty(false);
        }
    }, [rolePermissions]);

    // 默认选中第一个角色
    useEffect(() => {
        if (!selectedRole && displayRoles.length > 0) {
            setSelectedRole(displayRoles[0] as unknown as ApiRole);
        }
    }, []);

    const handleTogglePermission = (permissionId: string) => {
        if (!selectedRole || selectedRole.id === 'SUPER_ADMIN') return;

        const newSet = new Set(selectedPermissionIds);
        if (newSet.has(permissionId)) {
            newSet.delete(permissionId);
        } else {
            newSet.add(permissionId);
        }
        setSelectedPermissionIds(newSet);
        setIsDirty(true);
    };

    const handleSelectRole = (roleId: string) => {
        if (isDirty) {
            if (!confirm('当前更改未保存，确定要切换角色吗？')) return;
        }
        const role = displayRoles.find(r => r.id === roleId);
        if (role) setSelectedRole(role as unknown as ApiRole);
    };

    // 按模块分组权限
    const permissionsByModule = React.useMemo(() => {
        if (!permissions) return {};
        const groups: Record<string, Permission[]> = {};

        permissions.forEach(p => {
            // 根据当前 Tab 过滤模块
            const isUserSide = USER_SIDE_MODULES.includes(p.module);
            if (activeTab === 'user' && !isUserSide) return;
            if (activeTab === 'admin' && isUserSide) return;

            if (!groups[p.module]) groups[p.module] = [];
            groups[p.module].push(p);
        });
        return groups;
    }, [permissions, activeTab]);

    if (isLoadingRoles || isLoadingPermissions) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-6 shadow-xl shadow-violet-500/20 mb-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex items-center gap-6">
                    <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight mb-1">角色与权限管理</h2>
                        <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                            配置系统中不同角色的访问能力与功能限制。
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Roles List (Sidebar style) */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
                            Roles List
                        </h3>
                        <div className="space-y-3">
                            {displayRoles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => handleSelectRole(role.id)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 group ${selectedRole?.id === role.id
                                        ? `bg-${role.color}-50 border-${role.color}-200 ring-2 ring-${role.color}-500/20 shadow-lg`
                                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedRole?.id === role.id ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white'}`}>
                                            {role.icon}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${selectedRole?.id === role.id ? `text-${role.color}-700` : 'text-slate-700'}`}>
                                                {role.name}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{role.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Permissions Panel */}
                <div className="lg:col-span-8">
                    {selectedRole && (
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden h-full flex flex-col">
                            <div className="p-6 border-b border-slate-100/60 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <UserCog className="text-violet-600" size={20} />
                                    </h3>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => setActiveTab('user')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'user'
                                                ? 'bg-violet-600 text-white shadow-md'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <LayoutGrid size={14} /> 用户侧功能
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('admin')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'admin'
                                                ? 'bg-violet-600 text-white shadow-md'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <Settings size={14} /> 管理后台
                                        </button>
                                    </div>
                                </div>

                                {selectedRole.id !== 'SUPER_ADMIN' ? (
                                    <button
                                        onClick={() => updateMutation.mutate()}
                                        disabled={!isDirty || updateMutation.isPending}
                                        className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${isDirty
                                            ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/30 hover:scale-105'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {updateMutation.isPending ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        保存配置
                                    </button>
                                ) : (
                                    <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold flex items-center gap-2 border border-amber-100">
                                        <Lock size={12} />
                                        系统保护角色
                                    </div>
                                )}
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                                {selectedRole.id === 'SUPER_ADMIN' && (
                                    <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                                        <AlertCircle className="text-amber-500 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="text-sm font-bold text-amber-700">超级管理员权限锁定</h4>
                                            <p className="text-xs text-amber-600 mt-1">
                                                超级管理员默认拥有系统的每一项权限，此配置不可被更改或撤销。
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {Object.entries(permissionsByModule).map(([module, perms]) => (
                                    <div key={module} className="mb-8 last:mb-0">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-4 w-1 bg-violet-500 rounded-full" />
                                            <h4 className="text-sm font-black text-slate-600 uppercase tracking-wide">
                                                {MODULE_NAMES[module] || `${module} 模块`}
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {perms.map(perm => {
                                                const isSelected = selectedRole.id === 'SUPER_ADMIN' || selectedPermissionIds.has(perm.id);
                                                const isLocked = selectedRole.id === 'SUPER_ADMIN';

                                                return (
                                                    <div
                                                        key={perm.id}
                                                        onClick={() => !isLocked && handleTogglePermission(perm.id)}
                                                        className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 ${isLocked ? 'cursor-default opacity-80' : 'cursor-pointer hover:shadow-md'
                                                            } ${isSelected
                                                                ? 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200 shadow-sm'
                                                                : 'bg-white border-slate-100 hover:border-violet-200'
                                                            }`}
                                                    >
                                                        <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-violet-500 border-violet-500 scale-110'
                                                            : 'bg-slate-50 border-slate-300 group-hover:border-violet-400'
                                                            }`}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div>
                                                            <div className={`text-sm font-bold transition-colors ${isSelected ? 'text-violet-900' : 'text-slate-600'}`}>
                                                                {perm.name}
                                                            </div>
                                                            <div className={`text-xs mt-1 leading-snug ${isSelected ? 'text-violet-700/80' : 'text-slate-400'}`}>
                                                                {perm.description || '暂无描述'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {(!permissions || permissions.length === 0) && (
                                    <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="text-slate-300" size={32} />
                                        </div>
                                        <p className="text-slate-500 font-medium">暂无权限定义</p>
                                        <p className="text-xs text-slate-400 mt-1">请联系开发人员初始化 Permission 数据库</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
