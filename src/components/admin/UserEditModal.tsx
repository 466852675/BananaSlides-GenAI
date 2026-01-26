// src/components/admin/UserEditModal.tsx
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Shield, Coins, Star, Calendar } from 'lucide-react';
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || '');
            setRole(user.role);
            setPoints(user.points);
            setVipLevel(user.vipLevel || 0);
            setError('');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');
            await AdminAPI.updateUser(user.id, {
                nickname,
                role: role as any,
                points,
                vipLevel
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '更新用户信息失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">编辑用户信息</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* User Profile Summary */}
                    <div className="flex items-center gap-4 p-4 bg-violet-50 rounded-xl border border-violet-100/50">
                        <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center text-white text-lg font-bold">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : (user.nickname || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{user.nickname || '未命名用户'}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Mail size={10} />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full font-bold uppercase tracking-wider border border-violet-200/50">
                                    {user.role}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium border border-slate-200/50 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(user.createdAt).toLocaleDateString()} 加入
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">用户昵称</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all"
                                    placeholder="请输入昵称"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">身份角色</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="USER">普通用户</option>
                                        <option value="PROFESSIONAL">专业用户</option>
                                        <option value="ENTERPRISE">企业用户</option>
                                        <option value="ADMIN">管理员</option>
                                        <option value="SUPER_ADMIN">超级管理员</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">VIP 等级</label>
                                <div className="relative">
                                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={vipLevel}
                                        onChange={(e) => setVipLevel(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all appearance-none"
                                    >
                                        <option value={0}>VIP 0</option>
                                        <option value={1}>VIP 1</option>
                                        <option value={2}>VIP 2</option>
                                        <option value={3}>VIP 3</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">积分余额</label>
                            <div className="relative">
                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    value={points}
                                    onChange={(e) => setPoints(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                    {/* Footer */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 transition-all text-sm"
                        >
                            {loading ? '正在保存...' : '保存修改'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
