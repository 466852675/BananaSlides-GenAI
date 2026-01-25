import React, { useState } from 'react';
import { Settings, Save, Server, Globe, Shield, Bot, Database } from 'lucide-react';
import { useAppSettingsMasked, useUpdateAppSettings } from '../../api/settings';
import { GlobalSettingsModal } from '../GlobalSettingsModal';
import { AppSettings } from '../../types';

export const SystemSettings: React.FC = () => {
    const { data: currentSettings, isLoading } = useAppSettingsMasked();
    const updateSettingsMutation = useUpdateAppSettings();
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // 模拟基础设置保存
    const handleBasicInfoSave = () => {
        // TODO: 实现真实的基础设置保存 API
        alert('站点基础信息保存成功 (模拟)');
    };

    const handleSaveAISettings = (newSettings: AppSettings) => {
        updateSettingsMutation.mutate(newSettings, {
            onSuccess: () => {
                // Modal 会留在那里或由 Modal 内部逻辑关闭，这里只需确保状态同步
                // 由于 React Query 的 invalidation，currentSettings 会自动更新
            }
        });
    };

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/30 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 mix-blend-screen" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <Settings size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight mb-2">系统设置</h1>
                            <p className="text-slate-400 font-medium">全局控制台，管理站点元数据及运行环境。</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs font-mono text-slate-300">
                            v1.2.0-beta
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* 1. 站点基础信息 */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">站点基础信息</h2>
                                <p className="text-sm text-slate-500">对外展示的品牌名称与SEO元数据</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">站点名称</label>
                                    <input
                                        type="text"
                                        defaultValue="BananaSlides GenAI"
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">联系邮箱</label>
                                    <input
                                        type="email"
                                        defaultValue="support@bananaslides.com"
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">站点描述</label>
                                <textarea
                                    defaultValue="AI 驱动的智能 PPT 生成平台"
                                    rows={3}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-slate-700"
                                />
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleBasicInfoSave}
                                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-800/20 transition-all font-bold text-sm flex items-center gap-2"
                                >
                                    <Save size={16} /> 保存更改
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Env & Info */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-slate-300 rounded-3xl p-8 shadow-xl shadow-slate-900/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                                <Server className="text-emerald-400" size={20} />
                                <h3 className="font-bold text-white">运行环境</h3>
                            </div>
                            <div className="space-y-4 font-mono text-xs">
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-500 group-hover:text-slate-400 transition-colors">OS</span>
                                    <span className="text-white bg-slate-800 px-2 py-1 rounded border border-slate-700">Windows_NT x64</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Node</span>
                                    <span className="text-emerald-400">v20.10.0</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Database</span>
                                    <span className="text-blue-400">SQLite</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Memory</span>
                                    <span className="text-amber-400">4.2 GB / 16 GB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 mb-4 text-slate-800 font-bold">
                            <Shield className="text-rose-500" size={20} />
                            安全审计
                        </div>
                        <div className="text-sm text-slate-500 mb-6 leading-relaxed">
                            所有敏感操作（如模型 Key 变更、角色权限修改）均会被记录到 security.log 中。
                        </div>
                        <button className="w-full py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm">
                            下载审计日志
                        </button>
                    </div>
                </div>
            </div>

            {/* Global Settings Modal */}
            {currentSettings && (
                <GlobalSettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    currentSettings={currentSettings}
                    onSave={handleSaveAISettings}
                />
            )}
        </div>
    );
};
