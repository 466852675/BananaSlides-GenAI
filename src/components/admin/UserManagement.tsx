// src/components/admin/UserManagement.tsx
// 用户管理页面 - 视觉重构版 (Glassmorphism)

import React, { useEffect, useState, useCallback } from 'react';
import {
    Search,
    Filter,
    Edit2,
    Key,
    Ban,
    Check,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
    RefreshCcw,
    Shield,
    Mail,
    Calendar,
    CheckCircle,
    AlertCircle,
    Trash2,
    Plus
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { ConfirmDialog } from '../ConfirmDialog';
import { UserEditModal } from './UserEditModal';
import { UserCreateModal } from './UserCreateModal';
import { PasswordResetModal } from './PasswordResetModal';
import { PermissionTooltip } from '../PermissionTooltip.tsx';
import { useAuth } from '../../contexts/AuthContext';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AdminAPI.AdminUser[]>([]);
    const { user: currentUser } = useAuth(); // 获取当前登录管理员
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [vipFilter, setVipFilter] = useState<number | ''>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [amountType, setAmountType] = useState<'points' | 'spent' | ''>('');
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, pageSize: 8 });

    // 弹窗状态
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    // 编辑/重置密码弹窗状态
    const [selectedUser, setSelectedUser] = useState<AdminAPI.AdminUser | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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
                vipLevel: vipFilter !== '' ? Number(vipFilter) : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                amountType: amountType || undefined,
                minAmount: minAmount !== '' ? Number(minAmount) : undefined,
                maxAmount: maxAmount !== '' ? Number(maxAmount) : undefined,
                page,
                pageSize: 8
            });
            setUsers(result.users);
            setPagination(result.pagination);
        } catch (err: any) {
            setError(err.message || '加载用户列表失败');
        } finally {
            setLoading(false);
        }
    }, [debouncedKeyword, roleFilter, statusFilter, vipFilter, startDate, endDate, amountType, minAmount, maxAmount, page]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // 权限判断：只有超级管理员和系统管理员可以执行敏感操作
    const isPowerfulAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

    // 格式化时间
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 角色标签
    const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
        const styles: Record<string, string> = {
            'SUPER_ADMIN': 'bg-amber-100 text-amber-700 border-amber-200',
            'ADMIN': 'bg-slate-100 text-slate-700 border-slate-200',
            'ENTERPRISE': 'bg-indigo-100 text-indigo-700 border-indigo-200',
            'PREMIUM': 'bg-amber-100 text-amber-800 border-amber-300',
            'PROFESSIONAL': 'bg-violet-100 text-violet-700 border-violet-200',
            'BASIC': 'bg-blue-100 text-blue-700 border-blue-200',
            'USER': 'bg-slate-50 text-slate-600 border-slate-100'
        };
        const labels: Record<string, string> = {
            'SUPER_ADMIN': '系统管理员',
            'ADMIN': '业务管理员',
            'ENTERPRISE': '企业用户',
            'PREMIUM': '尊享用户',
            'PROFESSIONAL': '专业用户',
            'BASIC': '基础用户',
            'USER': '免费用户'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[role] || styles['USER']} flex items-center gap-1 w-fit whitespace-nowrap`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                {labels[role] || role}
            </span>
        );
    };

    // VIP 等级标签 (V8.5 简约版)
    const VipBadge: React.FC<{ level: number }> = ({ level }) => {
        const config: Record<number, { label: string; style: string }> = {
            0: { label: 'Lv0', style: 'bg-slate-100 text-slate-500 border-slate-200' },
            1: { label: 'Lv1', style: 'bg-blue-100 text-blue-600 border-blue-200' },
            2: { label: 'Lv2', style: 'bg-violet-100 text-violet-600 border-violet-200' },
            3: { label: 'Lv3', style: 'bg-amber-100 text-amber-600 border-amber-200' },
            4: { label: 'Lv4', style: 'bg-indigo-100 text-indigo-600 border-indigo-200' }
        };
        const { label, style } = config[level] || config[0];
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${style} w-fit shadow-sm`}>
                {label}
            </span>
        );
    };

    // 状态标签
    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        const styles: Record<string, string> = {
            'ACTIVE': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'DISABLED': 'bg-rose-50 text-rose-600 border-rose-100',
            'PENDING': 'bg-amber-50 text-amber-600 border-amber-100'
        };
        const labels: Record<string, string> = {
            'ACTIVE': '正常',
            'DISABLED': '禁用',
            'PENDING': '待核'
        };
        const icons = {
            'ACTIVE': <CheckCircle size={12} className="shrink-0" />,
            'DISABLED': <Ban size={12} className="shrink-0" />,
            'PENDING': <AlertCircle size={12} className="shrink-0" />
        };
        return (
            <div className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 w-fit whitespace-nowrap ${styles[status] || styles['PENDING']}`}>
                {icons[status] || <AlertCircle size={12} className="shrink-0" />}
                <span className="leading-none">{labels[status] || status}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <UserIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">用户中心</h2>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                监控全平台用户活跃度，管理用户权限与账户状态。
                            </p>
                        </div>
                    </div>

                    <PermissionTooltip requiredPermission="admin.users.create">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-violet-900/10"
                        >
                            <Plus size={18} /> 新增用户
                        </button>
                    </PermissionTooltip>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/60 shadow-sm overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex items-center gap-1 min-w-max">
                    <div className="relative group w-40 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="搜索用户..."
                            value={keyword}
                            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="relative flex-shrink-0">
                        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[85px]"
                        >
                            <option value="">角色</option>
                            <option value="SUPER_ADMIN">中心管理</option>
                            <option value="ADMIN">业务管理</option>
                            <option value="ENTERPRISE">企业</option>
                            <option value="PREMIUM">尊享</option>
                            <option value="PROFESSIONAL">专业</option>
                            <option value="BASIC">基础</option>
                            <option value="USER">免费</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="relative flex-shrink-0">
                        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={vipFilter}
                            onChange={(e) => { setVipFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[100px]"
                        >
                            <option value="">VIP等级</option>
                            <option value="0">Lv0 (免费)</option>
                            <option value="1">Lv1 (基础)</option>
                            <option value="2">Lv2 (专业)</option>
                            <option value="3">Lv3 (尊享)</option>
                            <option value="4">Lv4 (企业)</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="relative flex-shrink-0">
                        <CheckCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[80px]"
                        >
                            <option value="">状态</option>
                            <option value="ACTIVE">正常</option>
                            <option value="DISABLED">禁用</option>
                            <option value="PENDING">待核</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 bg-slate-50/50 p-1 rounded-lg border border-slate-100">
                        <select
                            value={amountType}
                            onChange={(e) => { setAmountType(e.target.value as any); setPage(1); }}
                            className="pl-1.5 pr-0.5 py-1.5 bg-transparent text-[11px] font-bold text-slate-600 outline-none cursor-pointer min-w-[65px]"
                        >
                            <option value="">数值类型</option>
                            <option value="points">积分</option>
                            <option value="spent">充值</option>
                        </select>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                placeholder="Min"
                                value={minAmount}
                                onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                className="w-12 px-1 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium outline-none focus:border-violet-400 transition-all"
                            />
                            <span className="text-slate-300 text-[10px]">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxAmount}
                                onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                className="w-12 px-1 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium outline-none focus:border-violet-400 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none hover:bg-white transition-all w-[100px]"
                            />
                        </div>
                        <span className="text-slate-300 font-bold text-[10px]">-</span>
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none hover:bg-white transition-all w-[100px]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setKeyword('');
                            setRoleFilter('');
                            setVipFilter('');
                            setStatusFilter('');
                            setStartDate('');
                            setEndDate('');
                            setAmountType('');
                            setMinAmount('');
                            setMaxAmount('');
                            setPage(1);
                        }}
                        className="px-2 py-2 bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center group flex-shrink-0"
                        title="重置筛选"
                    >
                        <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[520px]">
                {loading ? (
                    <div className="flex items-center justify-center h-[520px]">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                            <Ban size={32} />
                        </div>
                        <div className="text-slate-600 font-medium">{error}</div>
                        <button onClick={loadUsers} className="text-violet-600 font-bold hover:underline">重试</button>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <UserIcon size={40} />
                        </div>
                        <div className="text-slate-500 font-medium">没找到符合条件的用户</div>
                        <button onClick={() => { setKeyword(''); setRoleFilter(''); setStatusFilter(''); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-600 transition-colors">
                            清除筛选条件
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100/60 bg-slate-50/50">
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">基本信息</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">身份角色</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">VIP</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">账号状态</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">积分余额</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">累计充值</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">项目数据</th>
                                    <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">注册时间</th>
                                    <th className="text-right text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-violet-50/30 transition-colors">
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-violet-500/20 shrink-0">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        (user.nickname || user.email || 'U')[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-slate-800">
                                                        {user.nickname || (user.username ? `@${user.username}` : '未命名用户')}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                        <Mail size={9} />
                                                        {user.email || '无邮箱'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <VipBadge level={user.vipLevel} />
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="font-mono font-bold text-slate-700 text-[13px]">
                                                {user.points.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">PTS</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="font-mono font-bold text-blue-600 text-[13px]">
                                                <span className="text-[10px] mr-0.5">￥</span>
                                                {(user.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="text-[13px] font-medium text-slate-600">
                                                {user.projectCount || 0} <span className="text-slate-400 text-[11px]">项目</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <Calendar size={12} />
                                                {formatDate(user.createdAt).split(' ')[0]}
                                            </div>
                                            <div className="text-[10px] text-slate-400 pl-4.5">
                                                {formatDate(user.createdAt).split(' ')[1]}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5 transition-all">
                                                <PermissionTooltip requiredPermission="admin.users.manage.role">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-slate-100/50 shadow-sm"
                                                        title="编辑"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                </PermissionTooltip>
                                                <PermissionTooltip requiredPermission="admin.users.reset.password">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsResetModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-100/50 shadow-sm"
                                                        title="密码"
                                                    >
                                                        <Key size={14} />
                                                    </button>
                                                </PermissionTooltip>
                                                {isPowerfulAdmin && (
                                                    <>
                                                        <PermissionTooltip requiredPermission="admin.users.manage.status">
                                                            <button
                                                                onClick={() => {
                                                                    const newStatus = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
                                                                    const actionText = user.status === 'DISABLED' ? '启用' : '禁用';
                                                                    setConfirmConfig({
                                                                        isOpen: true,
                                                                        title: `${actionText}用户确认`,
                                                                        message: `您确定要${actionText}用户 "${user.nickname || user.email}" 吗？`,
                                                                        type: user.status === 'DISABLED' ? 'info' : 'danger',
                                                                        onConfirm: async () => {
                                                                            try {
                                                                                await AdminAPI.updateUser(user.id, { status: newStatus });
                                                                                loadUsers();
                                                                            } catch (err: any) {
                                                                                alert(err.message || '操作失败');
                                                                            } finally {
                                                                                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                                                            }
                                                                        }
                                                                    });
                                                                }}
                                                                className={`p-1.5 rounded-lg transition-colors border border-slate-100/50 shadow-sm ${user.status === 'DISABLED'
                                                                    ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                                                                    : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                                                                    }`}
                                                                title={user.status === 'DISABLED' ? '启用' : '禁用'}
                                                            >
                                                                {user.status === 'DISABLED' ? <Check size={14} /> : <Ban size={14} />}
                                                            </button>
                                                        </PermissionTooltip>
                                                        <PermissionTooltip requiredPermission="admin.users.delete">
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmConfig({
                                                                        isOpen: true,
                                                                        title: "删除用户确认 (高危操作)",
                                                                        message: `您确定要永久删除用户 "${user.nickname || user.email}" 吗？此操作不可逆，将清除该用户的所有关联数据！`,
                                                                        type: 'danger',
                                                                        onConfirm: async () => {
                                                                            try {
                                                                                await AdminAPI.deleteUser(user.id);
                                                                                loadUsers();
                                                                            } catch (err: any) {
                                                                                alert(err.message || '操作失败');
                                                                            } finally {
                                                                                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                                                            }
                                                                        }
                                                                    });
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-100/50 shadow-sm"
                                                                title="删除"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </PermissionTooltip>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && users.length > 0 && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100/60 bg-slate-50/30">
                        <div className="text-sm text-slate-500 font-medium">
                            显示第 <span className="font-bold text-slate-800">{(page - 1) * 8 + 1}</span> 到 <span className="font-bold text-slate-800">{Math.min(page * 8, pagination.total)}</span> 条，共 <span className="font-bold text-slate-800">{pagination.total}</span> 条
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
                                {page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page >= pagination.totalPages}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* 用户模态框 */}
            <UserEditModal
                isOpen={isEditModalOpen}
                user={selectedUser}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={loadUsers}
            />

            <PasswordResetModal
                isOpen={isResetModalOpen}
                user={selectedUser}
                onClose={() => setIsResetModalOpen(false)}
            />

            {/* Create User Modal */}
            <UserCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    loadUsers();
                }}
            />

            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type={confirmConfig.type}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default UserManagement;
