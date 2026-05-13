import React, { useState } from 'react';
import { Settings, Save, Server, Globe, Shield, Bot, Database, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { useAppSettingsMasked, useUpdateAppSettings } from '../../api/settings';
import { GlobalSettingsModal } from '../GlobalSettingsModal';
import { AppSettings } from '../../types';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { useCommercial, COMMERCIAL_MODULES } from '../../hooks/useCommercial';
import type { CommercialModuleId } from '../../hooks/useCommercial';
import { CommercialDisableModal } from './CommercialDisableModal';

export const SystemSettings: React.FC = () => {
    const { data: currentSettings, isLoading } = useAppSettingsMasked();
    const updateSettingsMutation = useUpdateAppSettings();
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const commercial = useCommercial();
    const [showCommercialModal, setShowCommercialModal] = useState(false);
    const [commercialModalMode, setCommercialModalMode] = useState<'disable' | 'enable'>('disable');
    const queryClient = useQueryClient();

    // 系统运行配置 (原 ConfigCenter逻辑)
    const { data: sysConfig, isLoading: sysConfigLoading } = useQuery({
        queryKey: ['system-config'],
        queryFn: AdminApi.getSystemConfig
    });

    const sysConfigMutation = useMutation({
        mutationFn: AdminApi.updateSystemConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-config'] });
            alert('系统运行配置已更新');
        },
        onError: (err: any) => alert(err.message || '更新失败')
    });

    const updateSysConfig = (newConfig: AdminApi.SystemConfig) => {
        sysConfigMutation.mutate(newConfig);
    };

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
        <div className="w-full h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden pr-2">
            {/* Hero Section - Standardized V8.0 Height & Style */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 p-6 shadow-xl shadow-slate-900/20 w-full shrink-0">
                <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">系统设置</h1>
                            <p className="text-slate-400 text-sm font-medium opacity-90 whitespace-nowrap">全局控制台，管理站点元数据及运行环境。</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-mono text-slate-300">
                            v1.2.0-beta
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Main Configuration Area (2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                    <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col min-h-0">
                        <div className="flex items-center gap-3 mb-4 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">站点基础信息</h2>
                                <p className="text-[10px] text-slate-500 font-medium">对外展示的品牌名称与SEO元数据</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">站点名称</label>
                                    <input
                                        type="text"
                                        defaultValue="YH-AI PPT"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">联系邮箱</label>
                                    <input
                                        type="email"
                                        defaultValue="support@bananaslides.com"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 h-full max-h-[120px]">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">站点描述</label>
                                <textarea
                                    defaultValue="AI 驱动的智能 PPT 生成平台"
                                    className="w-full h-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-slate-700 font-medium text-xs leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={handleBasicInfoSave}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg transition-all font-bold text-xs flex items-center gap-2 active:scale-95"
                            >
                                <Save size={16} /> 保存站点信息
                            </button>
                        </div>
                    </div>

                    <div className="h-[140px] bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center justify-between gap-6 shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                <Shield size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-0.5">系统安全审计</h3>
                                <p className="text-[11px] text-slate-500 max-w-sm leading-normal">所有敏感操作均会被加密记录，以供后续追溯与安全合规性检查。</p>
                            </div>
                        </div>
                        <button className="whitespace-nowrap px-6 py-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-700 hover:bg-white transition-all text-xs shadow-sm active:scale-95 flex items-center gap-2">
                            <Bot size={16} className="text-slate-400" /> 进入审计控制台
                        </button>
                    </div>
                </div>

                {/* Sidebar Configuration Area (1/3) */}
                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
                    <div className="flex-[3] bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col min-h-0">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3 shrink-0">
                            <Server className="text-violet-500" size={20} />
                            <div>
                                <h3 className="text-base font-bold text-slate-800">系统运行状态</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Global Switch</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 pt-2 shrink-0">
                            {sysConfigLoading ? (
                                <div className="flex justify-center py-6">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between group px-2 py-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="space-y-0.5">
                                            <label className="block text-xs font-black text-slate-700 leading-tight">运行维护模式</label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Maintenance</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={sysConfig?.SYSTEM_STATUS === 'MAINTENANCE'}
                                                onChange={(e) => updateSysConfig({
                                                    ...sysConfig!,
                                                    SYSTEM_STATUS: e.target.checked ? 'MAINTENANCE' : 'NORMAL'
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-red-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between group px-2 py-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="space-y-0.5">
                                            <label className="block text-xs font-black text-slate-700 leading-tight">注册通道</label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Reg Gate</p>
                                        </div>
                                        <select
                                            value={sysConfig?.REG_MODE || 'OPEN'}
                                            onChange={(e) => updateSysConfig({
                                                ...sysConfig!,
                                                REG_MODE: e.target.value as any
                                            })}
                                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
                                        >
                                            <option value="OPEN">全网开放</option>
                                            <option value="INVITE_ONLY">仅限邀请</option>
                                            <option value="CLOSED">彻底关闭</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-auto bg-amber-50 rounded-2xl p-4 border border-amber-100/50 flex items-start gap-2.5 shrink-0">
                            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">变更状态将立即广播至所有边缘节点。维护模式下仅支持管理员登录。</p>
                        </div>
                    </div>

                    {/* 商业化功能开关 */}
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col shrink-0">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                            <DollarSign className="text-amber-500" size={20} />
                            <div>
                                <h3 className="text-base font-bold text-slate-800">商业化功能</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Commercial</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {commercial.loading ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between group px-2 py-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="space-y-0.5">
                                            <label className="block text-xs font-black text-slate-700 leading-tight">功能总开关</label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                {commercial.enabled ? '已开启' : '已关闭'}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={commercial.enabled}
                                                onChange={() => {
                                                    if (commercial.enabled) {
                                                        // 开启 → 关闭：弹出模块选择弹窗（默认全选）
                                                        setCommercialModalMode('disable');
                                                        setShowCommercialModal(true);
                                                    } else {
                                                        // 关闭 → 开启：也弹出模块选择弹窗（默认全选），让管理员选择开启哪些模块
                                                        setCommercialModalMode('enable');
                                                        setShowCommercialModal(true);
                                                    }
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-red-600"></div>
                                        </label>
                                    </div>

                                    {/* 已关闭的模块列表 */}
                                    {!commercial.enabled && commercial.disabledModules.length > 0 && (
                                        <div className="px-2 py-2">
                                            <p className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">已关闭的模块：</p>
                                            <div className="flex flex-wrap gap-1">
                                                {commercial.disabledModules.map((modId: string) => (
                                                    <span key={modId} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg font-medium">
                                                        {COMMERCIAL_MODULES[modId as keyof typeof COMMERCIAL_MODULES]?.label || modId}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 审计日志 */}
                                    {commercial.auditLog.length > 0 && (
                                        <details className="group px-2">
                                            <summary className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors">
                                                <Clock size={12} />
                                                操作记录（{commercial.auditLog.length} 条）
                                            </summary>
                                            <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto">
                                                {commercial.auditLog.slice().reverse().map((entry, idx) => (
                                                    <div key={idx} className="text-[10px] p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className={`font-bold ${entry.action === 'disable' ? 'text-red-600' : 'text-green-600'}`}>
                                                                {entry.action === 'disable' ? '关闭' : '开启'}
                                                            </span>
                                                            <span className="text-slate-400">{new Date(entry.time).toLocaleString('zh-CN')}</span>
                                                        </div>
                                                        <div className="text-slate-500 mt-0.5">
                                                            操作人：{entry.operatorName}
                                                        </div>
                                                        {entry.modulesAffected.length > 0 && (
                                                            <div className="text-slate-400 mt-0.5">
                                                                影响模块：{entry.modulesAffected.length} 个
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-[2] bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-xl shadow-slate-900/10 relative overflow-hidden flex flex-col min-h-0 shrink-0">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] pointer-events-none -mr-6 -mt-6" />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800 pb-3 shrink-0">
                                <Database className="text-emerald-400" size={16} />
                                <h3 className="font-bold text-white uppercase tracking-widest text-[10px]">Runtime Info</h3>
                            </div>
                            <div className="flex-1 space-y-4 font-mono text-[10px] shrink-0">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-slate-500">Operating System</span>
                                    <span className="text-white">Windows LTSC</span>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-slate-500">Node Engine</span>
                                    <span className="text-emerald-400">v24.2.0</span>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-slate-500">Database</span>
                                    <span className="text-blue-400">SQLite v3.x</span>
                                </div>
                            </div>
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
            <CommercialDisableModal
                isOpen={showCommercialModal}
                isEnableMode={commercialModalMode === 'enable'}
                onClose={() => setShowCommercialModal(false)}
                onConfirm={(modules) => {
                    const isEnable = commercialModalMode === 'enable';
                    if (isEnable) {
                        // 开启模式：勾选的模块开启，未勾选的保持关闭
                        const allModuleIds = Object.keys(COMMERCIAL_MODULES) as CommercialModuleId[];
                        const keepDisabled = allModuleIds.filter((m) => !modules.includes(m));
                        commercial.update(true, keepDisabled);
                    } else {
                        // 关闭模式：勾选的模块关闭
                        commercial.update(false, modules);
                    }
                    setShowCommercialModal(false);
                }}
            />
        </div>
    );
};
