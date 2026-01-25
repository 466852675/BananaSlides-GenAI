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
        <div className="space-y-6">
            {/* 1. 站点基础设置 (Mock) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings className="text-violet-600" size={20} />
                    站点基础设置
                </h2>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                站点名称
                            </label>
                            <input
                                type="text"
                                defaultValue="BananaSlides GenAI"
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                联系邮箱
                            </label>
                            <input
                                type="email"
                                defaultValue="support@bananaslides.com"
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            站点描述
                        </label>
                        <textarea
                            defaultValue="AI 驱动的智能 PPT 生成平台"
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleBasicInfoSave}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center gap-2"
                        >
                            <Save size={16} /> 保存基础信息
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. AI 模型与全局参数 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Bot className="text-indigo-600" size={20} />
                        AI 模型与全局参数
                    </h2>
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
                    >
                        配置参数
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">当前 AI 提供商</div>
                        <div className="text-lg font-bold text-slate-800">
                            {currentSettings?.ai.provider === 'CustomCombo' ? '自定义组合 (Combo)' : currentSettings?.ai.provider}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">文本模型</div>
                        <div className="text-sm font-medium text-slate-800 font-mono">
                            {currentSettings?.ai.provider === 'CustomCombo'
                                ? currentSettings.ai.customCombo?.text.model
                                : currentSettings?.ai.models.text}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">绘图/视觉</div>
                        <div className="text-sm font-medium text-slate-800 font-mono">
                            {currentSettings?.ai.provider === 'CustomCombo'
                                ? `Img: ${currentSettings.ai.customCombo?.image.model}`
                                : `Img: ${currentSettings?.ai.models.image}`}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. 环境参数 (只读) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Server className="text-blue-600" size={20} />
                    环境参数 (只读)
                </h2>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">NODE_ENV</span>
                        <span className="text-slate-800">production</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">API_VERSION</span>
                        <span className="text-slate-800">v1.2.0</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">DATABASE_PROVIDER</span>
                        <span className="text-slate-800">sqlite</span>
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
