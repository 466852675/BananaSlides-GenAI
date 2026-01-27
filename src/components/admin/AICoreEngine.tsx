import React, { useState } from 'react';
import { Bot, Save, CircuitBoard, Sparkles, Zap, Cpu } from 'lucide-react';
import { useAppSettingsMasked, useUpdateAppSettings } from '../../api/settings';
import { GlobalSettingsModal } from '../GlobalSettingsModal';
import { AppSettings } from '../../types';

import toast from 'react-hot-toast';

export const AICoreEngine: React.FC = () => {
    const { data: currentSettings, isLoading } = useAppSettingsMasked();
    const updateSettingsMutation = useUpdateAppSettings();
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const handleSaveAISettings = (newSettings: AppSettings) => {
        updateSettingsMutation.mutate(newSettings, {
            onSuccess: () => {
                toast.success('配置保存成功！');
                setIsSettingsModalOpen(false); // Optionally close modal on success
            },
            onError: (error: any) => {
                toast.error(`保存失败: ${error.message}`);
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-8 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <Bot size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">AI 核心引擎</h1>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                全局模型路由控制台，管理 LLM 提供商、参数调优及多模态生成策略。
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="px-5 py-2.5 bg-white text-violet-600 rounded-xl shadow-lg shadow-black/10 font-bold text-sm hover:scale-105 active:scale-95 transition-all border border-white/50 flex items-center gap-2"
                    >
                        <Zap size={18} />
                        配置参数
                    </button>
                </div>
            </div>

            {/* AI Engine Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                                <CircuitBoard size={20} />
                            </div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Provider Strategy</div>
                        </div>
                        <div className="text-2xl font-black text-slate-800 tracking-tight">
                            {currentSettings?.ai.provider === 'CustomCombo' ? 'Custom Combo' : currentSettings?.ai.provider}
                        </div>
                        <div className="mt-2 text-xs font-medium text-slate-400">
                            Current active provider routing.
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Cpu size={20} />
                            </div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Text Model</div>
                        </div>
                        <div className="text-lg font-black text-slate-800 tracking-tight font-mono truncate" title={currentSettings?.ai.models.text}>
                            {currentSettings?.ai.provider === 'CustomCombo'
                                ? currentSettings.ai.customCombo?.text.model
                                : currentSettings?.ai.models.text}
                        </div>
                        <div className="mt-2 text-xs font-medium text-slate-400">
                            Primary text generation model.
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-all" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
                                <Sparkles size={20} />
                            </div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Model</div>
                        </div>
                        <div className="text-lg font-black text-slate-800 tracking-tight font-mono truncate">
                            {currentSettings?.ai.provider === 'CustomCombo'
                                ? currentSettings.ai.customCombo?.image.model
                                : currentSettings?.ai.models.image}
                        </div>
                        <div className="mt-2 text-xs font-medium text-slate-400">
                            Image & asset generation model.
                        </div>
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
