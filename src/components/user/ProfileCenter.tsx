import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AuthApi from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Camera, Shield, User, Lock, Save, X, AlertCircle } from 'lucide-react';
import { ImageUploader } from '../ImageUploader';
import { uploadFile } from '../../api/client';

interface ProfileCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onToast?: (message: string, type: 'success' | 'error') => void;
}

export const ProfileCenter: React.FC<ProfileCenterProps> = ({ isOpen, onClose, onToast }) => {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'info' | 'security' | 'invite'>('info');

    // Toast 工具函数
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (onToast) {
            onToast(message, type);
        } else {
            console.log(`[ProfileCenter] ${type}: ${message}`);
        }
    };

    // Info Form
    const [formData, setFormData] = useState({
        nickname: user?.nickname || '',
        bio: user?.bio || '',
        avatar: user?.avatar || ''
    });

    // Password Form
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const queryClient = useQueryClient();

    const updateProfileMutation = useMutation({
        mutationFn: AuthApi.updateProfile,
        onSuccess: () => {
            refreshUser();
            showToast('资料更新成功', 'success');
        },
        onError: (err: any) => showToast(err.message || '更新失败', 'error')
    });

    const updatePasswordMutation = useMutation({
        mutationFn: ({ oldP, newP }: any) => AuthApi.changePassword(oldP, newP),
        onSuccess: () => {
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            showToast('密码修改成功', 'success');
        },
        onError: (err: any) => showToast(err.message || '修改失败', 'error')
    });

    const handleAvatarUpload = async (file: File) => {
        try {
            const url = await uploadFile(file);
            setFormData(prev => ({ ...prev, avatar: url }));
            // Auto save avatar
            updateProfileMutation.mutate({ ...formData, avatar: url });
        } catch (error) {
            showToast('上传头像失败', 'error');
        }
    };

    const handleInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate(formData);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('两次输入的密码不一致', 'error');
            return;
        }
        updatePasswordMutation.mutate({
            oldP: passwordData.oldPassword,
            newP: passwordData.newPassword
        });
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-800">个人中心</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 bg-gray-50 border-r border-gray-100 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'info' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <User size={18} /> 个人资料
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Shield size={18} /> 账号安全
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'info' ? (
                            <form onSubmit={handleInfoSubmit} className="space-y-6 max-w-md">
                                <div className="flex justify-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-md">
                                            {formData.avatar ? (
                                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <User size={40} />
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <input type="file" className="hidden" accept="image/*" onChange={e => {
                                                if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]);
                                            }} />
                                            <Camera size={24} className="text-white" />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        value={formData.nickname}
                                        onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                    />
                                </div>
                                {/* Bio if available */}
                                {/* <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                                    <textarea 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        rows={3}
                                        value={formData.bio}
                                        onChange={e => setFormData({...formData, bio: e.target.value})}
                                    />
                                </div> */}

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={updateProfileMutation.isPending}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {updateProfileMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        保存更改
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                                <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-lg flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5" />
                                    <div>建议使用强密码，包含字母、数字和特殊符号。修改密码后需要重新登录。</div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        value={passwordData.oldPassword}
                                        onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={updatePasswordMutation.isPending}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {updatePasswordMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                                        修改密码
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
