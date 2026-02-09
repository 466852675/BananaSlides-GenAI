import React, { useState } from 'react';
import { User, Mail, Shield, Coins, Star, Lock, XCircle, Loader2 } from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { AdminDrawer } from './shared';

interface UserCreateModalProps {
    isOpen: boolean;
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

export const UserCreateModal: React.FC<UserCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [role, setRole] = useState('USER');
    const [points, setPoints] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                vipLevel: ROLE_VIP_MAP[role] ?? 0,
                points: Number(points)
            });
            onSuccess();
            onClose();
            // Reset form
            setEmail('');
            setPassword('');
            setNickname('');
            setRole('USER');
            // VIP等级由角色自动决定，无需重置
            setPoints(0);
        } catch (err: any) {
            setError(err.message || '创建用户失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title="新增系统用户"
            description="Create New User Account"
            width="narrow"
            footer={
                <div className="flex items-center gap-4 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all text-xs tracking-widest uppercase"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black hover:shadow-xl hover:shadow-violet-500/25 disabled:opacity-50 transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                正在创建
                            </>
                        ) : (
                            '确认创建'
                        )}
                    </button>
                </div>
            }
        >
            <AdminDrawer.HeadCard
                title="构建新的用户身份"
                description="Define account credentials & permissions"
                icon={User}
                variant="info"
            />

            <div className="space-y-6">
                {/* Section: Credentials */}
                <AdminDrawer.Section title="账号凭证">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">邮箱 (登录账号)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">初始登录密码</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400 font-mono"
                                    placeholder="请设置 6 位以上密码"
                                />
                            </div>
                        </div>
                    </div>
                </AdminDrawer.Section>

                {/* Section: Profile & Role */}
                <AdminDrawer.Section title="基础档案与权限">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">用户昵称</label>
                            <div className="relative group text-left">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="默认为邮箱前缀"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">身份角色</label>
                                <div className="relative group text-left">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="USER">免费用户 (Lv0)</option>
                                        <option value="BASIC">基础用户 (Lv1)</option>
                                        <option value="PROFESSIONAL">专业用户 (Lv2)</option>
                                        <option value="PREMIUM">尊享用户 (Lv3)</option>
                                        <option value="ENTERPRISE">企业用户 (Lv4)</option>
                                        <option value="ADMIN">业务管理员 (Lv9)</option>
                                        <option value="SUPER_ADMIN">系统管理员 (Lv10)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">VIP 等级（自动）</label>
                                <div className="relative group text-left">
                                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 transition-colors" size={18} />
                                    <div className="w-full pl-12 pr-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-2xl text-[11px] font-black text-slate-600">
                                        Lv{ROLE_VIP_MAP[role] ?? 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">初始积分</label>
                            <div className="relative group text-left">
                                <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="number"
                                    min="0"
                                    value={points}
                                    onChange={(e) => setPoints(Number(e.target.value))}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </AdminDrawer.Section>

                {error && (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-3 animate-pulse">
                        <XCircle size={16} />
                        {error}
                    </div>
                )}
            </div>
        </AdminDrawer>
    );
};
