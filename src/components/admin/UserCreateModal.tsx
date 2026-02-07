
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, User, Mail, Shield, Coins, Star, Lock, XCircle, Loader2, Crown, Sparkles } from 'lucide-react';
import * as AdminAPI from '../../api/admin';

interface UserCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [role, setRole] = useState('USER');
    const [vipLevel, setVipLevel] = useState(0);
    const [points, setPoints] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await AdminAPI.createUser({
                email,
                password,
                nickname,
                role,
                vipLevel: Number(vipLevel),
                points: Number(points)
            });
            onSuccess();
            onClose();
            // Reset form
            setEmail('');
            setPassword('');
            setNickname('');
            setRole('USER');
            setVipLevel(0);
            setPoints(0);
        } catch (err: any) {
            setError(err.message || '创建用户失败');
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
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">新增系统用户</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Create New User Account</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 pb-32">
                    {/* Welcome Illustration/Icon */}
                    <div className="relative p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[2rem] border border-indigo-100/50 shadow-sm overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none" />
                        <div className="relative w-16 h-16 mx-auto bg-white rounded-3xl shadow-sm flex items-center justify-center text-indigo-600 mb-3 border border-indigo-50">
                            <User size={32} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">构建新的用户身份</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Define account credentials & permissions</p>
                    </div>

                    {/* Inputs Grouped by Sections */}
                    <div className="space-y-8">
                        {/* Section: Credentials */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">账号凭证</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">邮箱 (登录账号)</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="user@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">初始登录密码</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all placeholder:text-slate-400 font-mono"
                                        placeholder="请设置 6 位以上密码"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Profile & Role */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">基础档案与权限</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">用户昵称</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="默认为邮箱前缀"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">初始积分</label>
                                <div className="relative group">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="number"
                                        min="0"
                                        value={points}
                                        onChange={(e) => setPoints(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all"
                                    />
                                </div>
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
                                正在创建
                            </>
                        ) : (
                            '确认创建'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
