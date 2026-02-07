// src/components/admin/PasswordResetModal.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Key, ShieldAlert, Mail, User as UserIcon } from 'lucide-react';
import * as AdminAPI from '../../api/admin';

interface PasswordResetModalProps {
    isOpen: boolean;
    user: AdminAPI.AdminUser | null;
    onClose: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, user, onClose }) => {
    const [newPassword, setNewPassword] = useState('123456');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');
            setSuccess(false);
            await AdminAPI.resetUserPassword(user.id, newPassword);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        } catch (err: any) {
            setError(err.message || '重置密码失败');
        } finally {
            setLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">安全选项：重置密码</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* User Profile Summary */}
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : (user.nickname || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-800">{user.nickname || '未命名用户'}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Mail size={10} />
                                {user.email}
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 flex items-start gap-2.5">
                        <ShieldAlert className="text-rose-500 shrink-0 mt-0.5" size={16} />
                        <div className="text-[11px] text-rose-600 leading-relaxed font-medium">
                            请输入该用户的新密码。此操作将立即生效，用户之前的密码将无法继续使用。
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">新密码</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:border-amber-500 outline-none transition-all"
                                placeholder="请输入新密码"
                            />
                        </div>
                    </div>

                    {error && <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                    {success && <div className="text-xs text-emerald-500 bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-bold text-center">密码重置成功！</div>}

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
                            disabled={loading || success}
                            className="flex-[2] py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 transition-all text-sm"
                        >
                            {loading ? '正在处理...' : '确认重置'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
