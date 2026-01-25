// src/components/admin/UserManagement.tsx
// 用户管理页面

import React, { useEffect, useState, useCallback } from 'react';
import {
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Key,
    Ban,
    Check,
    ChevronLeft,
    ChevronRight,
    Shield,
    User as UserIcon
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AdminAPI.AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, pageSize: 20 });

    // 防抖搜索
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    // 加载用户列表
    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const result = await AdminAPI.getUsers({
                keyword: debouncedKeyword || undefined,
                role: roleFilter || undefined,
                status: statusFilter || undefined,
                page,
                pageSize: 20
            });
            setUsers(result.users);
            setPagination(result.pagination);
        } catch (err: any) {
            setError(err.message || '加载用户列表失败');
        } finally {
            setLoading(false);
        }
    }, [debouncedKeyword, roleFilter, statusFilter, page]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // 格式化时间
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN');
    };

    // 角色标签
    const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
        const colors: Record<string, string> = {
            'SUPER_ADMIN': 'bg-red-100 text-red-700',
            'ADMIN': 'bg-amber-100 text-amber-700',
            'USER': 'bg-slate-100 text-slate-600'
        };
        const labels: Record<string, string> = {
            'SUPER_ADMIN': '超级管理员',
            'ADMIN': '管理员',
            'USER': '普通用户'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || colors['USER']}`}>
                {labels[role] || role}
            </span>
        );
    };

    // 状态标签
    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        const colors: Record<string, string> = {
            'ACTIVE': 'bg-green-100 text-green-700',
            'DISABLED': 'bg-red-100 text-red-700',
            'PENDING': 'bg-yellow-100 text-yellow-700'
        };
        const labels: Record<string, string> = {
            'ACTIVE': '正常',
            'DISABLED': '已禁用',
            'PENDING': '待验证'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors['PENDING']}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* 筛选栏 */}
            <div className="flex flex-wrap items-center gap-4">
                {/* 搜索框 */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索邮箱、用户名、昵称..."
                        value={keyword}
                        onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    />
                </div>

                {/* 角色筛选 */}
                <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 outline-none"
                >
                    <option value="">全部角色</option>
                    <option value="USER">普通用户</option>
                    <option value="ADMIN">管理员</option>
                    <option value="SUPER_ADMIN">超级管理员</option>
                </select>

                {/* 状态筛选 */}
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 outline-none"
                >
                    <option value="">全部状态</option>
                    <option value="ACTIVE">正常</option>
                    <option value="DISABLED">已禁用</option>
                    <option value="PENDING">待验证</option>
                </select>
            </div>

            {/* 用户表格 */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
                    </div>
                ) : error ? (
                    <div className="p-6 text-center text-red-600">{error}</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <UserIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <div>暂无用户数据</div>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">用户</th>
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">角色</th>
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">状态</th>
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">积分</th>
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">项目数</th>
                                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">注册时间</th>
                                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-medium">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    (user.nickname || user.email || 'U')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-800">
                                                    {user.nickname || user.username || '未设置昵称'}
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={user.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600">{user.points}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600">{user.projectCount || 0}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-500">{formatDate(user.createdAt)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="编辑"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="重置密码"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                className={`p-2 rounded-lg transition-colors ${user.status === 'DISABLED'
                                                    ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={user.status === 'DISABLED' ? '启用' : '禁用'}
                                            >
                                                {user.status === 'DISABLED' ? <Check size={16} /> : <Ban size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* 分页 */}
                {!loading && users.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                        <div className="text-sm text-slate-500">
                            共 {pagination.total} 条记录，第 {page} / {pagination.totalPages} 页
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page >= pagination.totalPages}
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
