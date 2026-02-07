// src/components/admin/UserEditModal.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, User as UserIcon, Mail, Shield, Coins, Star, Calendar, Clock, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import * as AdminAPI from '../../api/admin';

interface UserEditModalProps {
    isOpen: boolean;
    user: AdminAPI.AdminUser | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
    const [nickname, setNickname] = useState('');
    const [role, setRole] = useState('');
    const [points, setPoints] = useState(0);
    const [vipLevel, setVipLevel] = useState(0);
    const [vipExpiresAt, setVipExpiresAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || '');
            setRole(user.role);
            setPoints(user.points);
            setVipLevel(user.vipLevel || 0);
            // Format date to YYYY-MM-DD for input[type="date"]
            if (user.vipExpiresAt) {
                const date = new Date(user.vipExpiresAt);
                setVipExpiresAt(date.toISOString().split('T')[0]);
            } else {
                setVipExpiresAt('');
            }
            setError('');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');

            // Construct payload
            const payload: any = {
                nickname,
                role: role as any,
                points,
                vipLevel
            };

            // Only send vipExpiresAt if it has a value, or if we explicitly want to clear it (logic depends on backend)
            // Assuming backend accepts ISO string or null
            if (vipExpiresAt) {
                // Convert back to ISO string (start of day or preserve existing time if possible, but keeping it simple)
                payload.vipExpiresAt = new Date(vipExpiresAt).toISOString();
            } else {
                // If cleared, you might want to send null or handle differently. 
                // For now, if empty, we might not update it or send null if backend supports.
                // Let's assume sending null clears it if that's the intent, or just omit if no change.
                // AdminAPI/Prisma usually expects Date object or ISO string.
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

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[300] flex justify-end overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">编辑用户信息</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Edit User Profile</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 pb-32">
                    {/* User Profile Summary */}
                    <div className="relative group p-6 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-[2rem] border border-violet-100/50 shadow-sm overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-200/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="relative flex items-center gap-5">
                            <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-violet-600 text-2xl font-black border border-white p-1">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white">
                                        {(user.nickname || user.email || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-lg font-black text-slate-800 truncate mb-0.5">
                                    {user.nickname || '未命名用户'}
                                </div>
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 opacity-80">
                                    <Mail size={12} className="text-violet-400" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <span className="text-[10px] px-2.5 py-1 bg-white/80 text-violet-600 rounded-full font-black border border-violet-100/50 shadow-sm">
                                        {user.role}
                                    </span>
                                    <span className="text-[10px] px-2.5 py-1 bg-white/80 text-slate-500 rounded-full font-bold border border-slate-100/50 shadow-sm flex items-center gap-1">
                                        <Calendar size={10} className="text-slate-400" />
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inputs Grouped by Sections */}
                    <div className="space-y-8">
                        {/* Section: Basic Settings */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">账号基础设置</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">用户昵称</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="请输入昵称"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">身份角色</label>
                                <div className="relative group">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="USER">免费用户 (USER)</option>
                                        <option value="BASIC">基础用户 (BASIC)</option>
                                        <option value="PROFESSIONAL">专业用户 (PROFESSIONAL)</option>
                                        <option value="PREMIUM">尊享用户 (PREMIUM)</option>
                                        <option value="ENTERPRISE">企业用户 (ENTERPRISE)</option>
                                        <option value="ADMIN">业务管理员 (ADMIN)</option>
                                        <option value="SUPER_ADMIN">系统管理员 (SUPER_ADMIN)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Star size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Economic & VIP Settings */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">价值与权益设置</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">积分余额</label>
                                    <div className="relative group">
                                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                        <input
                                            type="number"
                                            value={points}
                                            onChange={(e) => setPoints(Number(e.target.value))}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">VIP 等级</label>
                                    <div className="relative group">
                                        <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                        <select
                                            value={vipLevel}
                                            onChange={(e) => setVipLevel(Number(e.target.value))}
                                            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value={0}>VIP 0</option>
                                            <option value={1}>VIP 1</option>
                                            <option value={2}>VIP 2</option>
                                            <option value={3}>VIP 3</option>
                                            <option value={4}>VIP 4</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">VIP 到期时间</label>
                                <div className="relative group">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="date"
                                        value={vipExpiresAt}
                                        onChange={(e) => setVipExpiresAt(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 ml-1 flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    清空日期将视为取消该用户的 VIP 期限限制
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-3 animate-pulse">
                            <XCircle size={16} />
                            {error}
                        </div>
                    )}
                </form>

                {/* Footer - Sticky */}
                <div className="px-8 py-6 border-t border-slate-100 bg-white/80 backdrop-blur-xl flex items-center justify-center gap-4 shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] sticky bottom-0 z-10 rounded-t-[2.5rem]">
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
                        className="flex-[2] py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-violet-500/25 disabled:opacity-50 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
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
            </div>
        </div>,
        document.body
    );
};
