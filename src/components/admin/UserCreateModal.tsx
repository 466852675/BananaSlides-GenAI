
import React, { useState } from 'react';
import { X, User, Mail, Shield, Coins, Star, Lock } from 'lucide-react';
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

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">新增用户</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">邮箱 (登录账号)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all"
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">初始密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text" // Show password explicitly for admin creation
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all"
                                    placeholder="设在初始登录密码"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">用户昵称</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all"
                                    placeholder="可选"
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
                                        <option value="USER">免费用户</option>
                                        <option value="BASIC">基础用户</option>
                                        <option value="PROFESSIONAL">专业用户</option>
                                        <option value="PREMIUM">尊享用户</option>
                                        <option value="ENTERPRISE">企业用户</option>
                                        <option value="ADMIN">业务管理员</option>
                                        <option value="SUPER_ADMIN">系统管理员</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">初始积分</label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="number"
                                        min="0"
                                        value={points}
                                        onChange={(e) => setPoints(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-violet-500 outline-none transition-all"
                                    />
                                </div>
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
                                    <option value={0}>VIP 0 (免费用户)</option>
                                    <option value={1}>VIP 1 (基础用户)</option>
                                    <option value={2}>VIP 2 (专业用户)</option>
                                    <option value={3}>VIP 3 (尊享用户)</option>
                                    <option value={4}>VIP 4 (企业用户)</option>
                                </select>
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
                            {loading ? '正在创建...' : '确认创建'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
