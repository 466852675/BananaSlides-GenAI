// src/components/admin/UserEditModal.tsx
import React, { useState, useEffect } from 'react';
import { Mail, Shield, Coins, Star, Calendar, Clock, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { AdminDrawer } from './shared';

interface UserEditModalProps {
    isOpen: boolean;
    user: AdminAPI.AdminUser | null;
    onClose: () => void;
    onSuccess: () => void;
}

// 角色与VIP等级严格对应关系
const ROLE_VIP_MAP: Record<string, number> = {
    'USER': 0,
    'BASIC': 1,
    'PROFESSIONAL': 2,
    'PREMIUM': 3,
    'ENTERPRISE': 4,
    'ADMIN': 9,
    'SUPER_ADMIN': 10
};

export const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
    const [nickname, setNickname] = useState('');
    const [role, setRole] = useState('');
    const [points, setPoints] = useState(0);
    const [vipExpiresAt, setVipExpiresAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || '');
            setRole(user.role);
            setPoints(user.points);
            if (user.vipExpiresAt) {
                const date = new Date(user.vipExpiresAt);
                setVipExpiresAt(date.toISOString().split('T')[0]);
            } else {
                setVipExpiresAt('');
            }
            setError('');
        }
    }, [user]);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');

            const payload: any = {
                nickname,
                role: role as any,
                points,
                vipLevel: ROLE_VIP_MAP[role] ?? 0
            };

            if (vipExpiresAt) {
                payload.vipExpiresAt = new Date(vipExpiresAt).toISOString();
            } else {
                payload.vipExpiresAt = null;
            }

            await AdminAPI.updateUser(user.id, payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '更新用户信息失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title="编辑用户信息"
            description="Edit User Profile & Credentials"
            width="narrow"
            footer={
                <div className="flex items-center justify-center gap-4 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm tracking-widest uppercase"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] py-4 px-6 bg-slate-900 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-slate-500/10 disabled:opacity-50 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                正在保存
                            </>
                        ) : (
                            '保存修改'
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* User Identity Header */}
                <AdminDrawer.HeadCard
                    title={user.nickname || '未命名用户'}
                    description={user.email}
                    icon={Mail}
                    variant="info"
                >
                    <div className="flex gap-2 mt-2">
                        <span className="text-[9px] px-2 py-0.5 bg-white text-indigo-600 rounded-lg font-black border border-indigo-100 uppercase tracking-tighter">
                            {user.role}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 bg-white text-slate-400 rounded-lg font-bold border border-slate-100 uppercase tracking-tighter flex items-center gap-1">
                            <Calendar size={10} />
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </AdminDrawer.HeadCard>

                {/* Section: Basic Settings */}
                <AdminDrawer.Section title="账号基础设置" icon={Shield}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">用户昵称</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="请输入昵称"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">身份角色</label>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="USER">免费用户 (Lv0)</option>
                                    <option value="BASIC">基础用户 (Lv1)</option>
                                    <option value="PROFESSIONAL">专业用户 (Lv2)</option>
                                    <option value="PREMIUM">尊享用户 (Lv3)</option>
                                    <option value="ENTERPRISE">企业用户 (Lv4)</option>
                                    <option value="ADMIN">业务管理员 (Lv9)</option>
                                    <option value="SUPER_ADMIN">系统管理员 (Lv10)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Star size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                </AdminDrawer.Section>

                {/* Section: Economic & VIP Settings */}
                <AdminDrawer.Section title="价值与权益核心" icon={Coins}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">积分余额</label>
                                <div className="relative group">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        type="number"
                                        value={points}
                                        onChange={(e) => setPoints(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">VIP 等级（自动）</label>
                                <div className="relative group">
                                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 transition-colors" size={18} />
                                    <div className="w-full pl-12 pr-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600">
                                        Lv{ROLE_VIP_MAP[role] ?? 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">VIP 到期时间</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="date"
                                    value={vipExpiresAt}
                                    onChange={(e) => setVipExpiresAt(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 ml-1 flex items-center gap-1 font-medium italic">
                                <AlertCircle size={10} />
                                清空日期将视为取消该用户的 VIP 期限限制
                            </p>
                        </div>
                    </div>
                </AdminDrawer.Section>

                {error && (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                        <XCircle size={16} />
                        {error}
                    </div>
                )}
            </div>
        </AdminDrawer>
    );
};
