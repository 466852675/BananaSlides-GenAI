
import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Image as ImageIcon, Globe, Save, RotateCcw, Server, FileText, Eye, X, Zap, Sparkles, Database, ShieldAlert, Check, Layout, Code, Lock, CheckCircle } from 'lucide-react';
import { AppSettings, AIProvider, ImageResolution, OutputLanguage, CustomComboConfig } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { useResetSettings } from '../api/settings';
import { AdminDrawer } from './admin/shared';

interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: AppSettings;
    onSave: (settings: AppSettings) => void;
    readOnly?: boolean;
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PROVIDERS: { label: string; value: AIProvider }[] = [
    { label: 'Google Gemini', value: 'Gemini' },
    { label: 'OpenAI', value: 'OpenAI' },
    { label: '智谱 AI (Zhipu)', value: 'Zhipu' },
    { label: '硅基流动 (SiliconFlow)', value: 'SiliconFlow' },
    { label: '魔塔社区 (ModelScope)', value: 'ModelScope' },
    { label: '火山引擎 (Volcengine)', value: 'Volcengine' },
    { label: '自定义 (Custom)', value: 'Custom' },
    { label: '自定义组合 (Combo)', value: 'CustomCombo' },
];

interface ProviderPreset {
    baseUrl: string;
    models: {
        text: string;
        image: string;
        vision: string;
    }
}

const PROVIDER_PRESETS: Partial<Record<AIProvider, ProviderPreset>> = {
    'OpenAI': {
        baseUrl: 'https://api.openai.com/v1',
        models: { text: 'gpt-4-turbo', image: 'dall-e-3', vision: 'gpt-4-vision-preview' }
    },
    'Gemini': {
        baseUrl: 'https://generativelanguage.googleapis.com',
        models: { text: 'gemini-3-pro-preview', image: 'gemini-3-pro-image-preview', vision: 'gemini-3-pro-preview' }
    },
    'Zhipu': {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        models: { text: 'glm-4', image: 'cogview-3', vision: 'glm-4v' }
    },
    'SiliconFlow': {
        baseUrl: 'https://api.siliconflow.cn/v1',
        models: { text: 'deepseek-ai/DeepSeek-V2.5', image: 'black-forest-labs/FLUX.1-schnell', vision: 'deepseek-ai/DeepSeek-V2.5' }
    },
    'ModelScope': {
        baseUrl: 'https://api-inference.modelscope.cn/v1',
        models: { text: 'qwen-max', image: 'wanx-v1', vision: 'qwen-vl-max' }
    },
    'Volcengine': {
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: { text: 'doubao-pro-256k', image: 'doubao-image', vision: 'doubao-vision-pro' }
    }
};

const RESOLUTIONS: { label: string; value: ImageResolution; desc: string }[] = [
    { label: '1K (快速)', value: '1024x1024', desc: '适合快速预览 (HD)' },
    { label: '2K (标准)', value: '2048x2048', desc: '适合屏幕投影 (FHD)' },
    { label: '4K (超清)', value: '3840x2160', desc: '适合打印输出 (UHD)' },
];

const LANGUAGES: { label: string; value: OutputLanguage }[] = [
    { label: '简体中文', value: 'zh' },
    { label: 'English', value: 'en' },
    { label: '日本語', value: 'ja' },
    { label: '自动检测', value: 'auto' },
];

const DEFAULT_COMBO_CONFIG: CustomComboConfig = {
    text: {
        baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        apiKey: '',
        model: 'glm-4.7'
    },
    image: {
        baseUrl: 'http://127.0.0.1:8045/v1',
        apiKey: '',
        model: 'gemini-3-pro-image'
    },
    vision: {
        baseUrl: 'http://127.0.0.1:8045/v1',
        apiKey: '',
        model: 'gemini-3-flash'
    }
};

export const DEFAULT_SETTINGS: AppSettings = {
    ai: {
        provider: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: '',
        models: {
            text: 'gemini-3-pro-preview',
            image: 'gemini-3-pro-image',
            vision: 'gemini-3-pro-preview'
        },
        customCombo: DEFAULT_COMBO_CONFIG
    },
    docParser: {
        provider: 'MinerU',
        baseUrl: 'https://mineru.net',
        apiKey: ''
    },
    imageGeneration: {
        resolution: '2048x2048'
    },
    performance: {
        textConcurrency: 1,
        imageConcurrency: 2
    },
    language: 'zh'
};

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave, readOnly = false, showToast }) => {
    const [settings, setSettings] = useState<AppSettings>(currentSettings);
    const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'reset', isOpen: boolean }>({ type: 'save', isOpen: false });
    const resetMutation = useResetSettings();

    useEffect(() => {
        if (isOpen) {
            setSettings({
                ...currentSettings,
                ai: {
                    ...currentSettings.ai,
                    customCombo: currentSettings.ai.customCombo || DEFAULT_COMBO_CONFIG
                }
            });
        }
    }, [isOpen, currentSettings]);

    const handleProviderChange = (provider: AIProvider) => {
        const preset = currentSettings.envPresets?.[provider] || PROVIDER_PRESETS[provider];
        setSettings(prev => ({
            ...prev,
            ai: {
                ...prev.ai,
                provider,
                baseUrl: preset?.baseUrl ?? prev.ai.baseUrl,
                models: preset?.models ? { ...preset.models } : prev.ai.models
            }
        }));
    };

    const handleResetClick = () => setConfirmAction({ type: 'reset', isOpen: true });
    const handleSaveClick = () => setConfirmAction({ type: 'save', isOpen: true });

    const performReset = () => {
        resetMutation.mutate(undefined, {
            onSuccess: () => {
                setConfirmAction({ ...confirmAction, isOpen: false });
                showToast?.('配置已重置为默认值', 'success');
            }
        });
    };

    const performSave = () => {
        onSave(settings);
        setConfirmAction({ ...confirmAction, isOpen: false });
    };

    const updateComboSettings = (type: keyof CustomComboConfig, field: keyof CustomComboConfig['text'], value: string) => {
        setSettings(prev => ({
            ...prev,
            ai: {
                ...prev.ai,
                customCombo: {
                    ...(prev.ai.customCombo || DEFAULT_COMBO_CONFIG),
                    [type]: {
                        ...(prev.ai.customCombo?.[type] || DEFAULT_COMBO_CONFIG[type]),
                        [field]: value
                    }
                }
            }
        }));
    };

    const isCombo = settings.ai.provider === 'CustomCombo';

    return (
        <>
            <AdminDrawer
                isOpen={isOpen}
                onClose={onClose}
                title="全局系统配置"
                description="Global Engine Settings"
                width="wide"
                headerExtra={
                    readOnly && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black border border-amber-200/50 uppercase">
                            <Eye size={12} /> Read Only
                        </span>
                    )
                }
                footer={
                    readOnly ? (
                        <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-widest text-xs w-full justify-center py-2">
                            <ShieldAlert size={18} className="text-amber-500" />
                            <span>Preview Only - Modifying Disabled</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 w-full">
                            <button
                                onClick={handleResetClick}
                                className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} />
                                重置默认
                            </button>
                            <button
                                onClick={handleSaveClick}
                                className="flex-[2] py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-indigo-500/25 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                            >
                                <Save size={18} strokeWidth={3} />
                                保存当前生效配置
                            </button>
                        </div>
                    )
                }
            >
                <div className="space-y-10">
                    {/* 1. Model Configuration */}
                    <AdminDrawer.Section title="AI 内核模型配置" icon={Server}>
                        <AdminDrawer.Card className="space-y-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI 核心供应商 (Primary Provider)</label>
                                <div className="flex flex-wrap gap-2">
                                    {PROVIDERS.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => handleProviderChange(p.value)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${settings.ai.provider === p.value
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-500 hover:bg-white'
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isCombo ? (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4">
                                        <Zap className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <div className="text-[10px] text-amber-800 leading-relaxed font-bold uppercase tracking-wider">
                                            <p className="text-amber-900 mb-1 font-black">自定义混合模式 (Mixed Mode Strategy)</p>
                                            系统将为不同原子任务调度独立的 API 实例。项留空将自动降级。
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { type: 'text' as const, icon: FileText, label: '文本层 (Text)', color: 'indigo' },
                                            { type: 'image' as const, icon: ImageIcon, label: '渲染层 (Image)', color: 'rose' },
                                            { type: 'vision' as const, icon: Eye, label: '感知层 (Vision)', color: 'emerald' }
                                        ].map(item => (
                                            <div key={item.type} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-8 h-8 rounded-lg bg-${item.color}-500 flex items-center justify-center text-white shadow-sm`}>
                                                        <item.icon size={16} />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-800">{item.label}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Endpoint</span>
                                                        <input
                                                            type="text"
                                                            value={settings.ai.customCombo?.[item.type].baseUrl || ''}
                                                            onChange={(e) => updateComboSettings(item.type, 'baseUrl', e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:border-indigo-500 outline-none transition-all"
                                                            placeholder="URL..."
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Model</span>
                                                        <input
                                                            type="text"
                                                            value={settings.ai.customCombo?.[item.type].model || ''}
                                                            onChange={(e) => updateComboSettings(item.type, 'model', e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:border-indigo-500 outline-none transition-all"
                                                            placeholder="Model..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API 基础路径 (Base URL)</label>
                                            <div className="relative group">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    value={settings.ai.baseUrl || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, baseUrl: e.target.value } }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="https://api.example.com/v1"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">验证凭证 (API Key)</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    value={settings.ai.apiKey || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, apiKey: e.target.value } }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-rose-500 outline-none transition-all font-mono"
                                                    placeholder={settings.ai.provider === 'Gemini' ? "使用内置密钥" : "sk-..."}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">集群映射 (Model Mapping)</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { field: 'text' as const, label: '文本生成', icon: FileText, color: 'indigo' },
                                                { field: 'image' as const, label: '图像创作', icon: ImageIcon, color: 'rose' },
                                                { field: 'vision' as const, label: '多模态感知', icon: Eye, color: 'emerald' }
                                            ].map(m => (
                                                <div key={m.field} className="space-y-2">
                                                    <span className="text-[10px] font-bold text-slate-500 ml-1 flex items-center gap-1.5">
                                                        <m.icon size={12} className={`text-${m.color}-500`} />
                                                        {m.label}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.models[m.field] || ''}
                                                        onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, [m.field]: e.target.value } } }))}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:border-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* 2. Document Parser (MinerU) */}
                    <AdminDrawer.Section title="结构化文档解析 (Doc Parser)" icon={Code}>
                        <AdminDrawer.Card className="space-y-6">
                            <div className="flex items-start gap-4 p-5 bg-orange-50 rounded-2xl border border-orange-100/50">
                                <div className="w-10 h-10 shrink-0 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-500">
                                    <Sparkles size={20} />
                                </div>
                                <div className="text-[10px] text-orange-800 leading-relaxed font-bold uppercase tracking-wider">
                                    <p className="text-orange-900 mb-1 font-black">MinerU (Magic-PDF) 解析器</p>
                                    工业级 PDF 转 Markdown 工具。配置后将启用结构化提取。
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parser Endpoint</label>
                                    <input
                                        type="text"
                                        value={settings.docParser?.baseUrl || 'https://mineru.net'}
                                        onChange={(e) => setSettings(s => ({
                                            ...s,
                                            docParser: { ...s.docParser, baseUrl: e.target.value, provider: 'MinerU' }
                                        }))}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MinerU Token</label>
                                    <input
                                        type="password"
                                        value={settings.docParser?.apiKey || ''}
                                        onChange={(e) => setSettings(s => ({
                                            ...s,
                                            docParser: { ...s.docParser, apiKey: e.target.value, provider: 'MinerU' }
                                        }))}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all font-mono"
                                        placeholder="sk-..."
                                    />
                                </div>
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* 3. Multimedia & Generation */}
                    <AdminDrawer.Section title="图像生成分辨率 (Resolution)" icon={ImageIcon}>
                        <AdminDrawer.Card>
                            <div className="grid grid-cols-3 gap-3">
                                {RESOLUTIONS.map(res => {
                                    const isSelected = settings.imageGeneration.resolution === res.value;
                                    return (
                                        <button
                                            key={res.value}
                                            onClick={() => setSettings(s => ({ ...s, imageGeneration: { resolution: res.value } }))}
                                            className={`relative group p-5 rounded-2xl border-2 transition-all text-left overflow-hidden ${isSelected
                                                ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-100'
                                                : 'bg-slate-50 border-slate-100 hover:border-rose-200 hover:bg-white'
                                                }`}
                                        >
                                            <div className="relative z-10">
                                                <div className={`text-md font-black mb-1 ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>{res.label}</div>
                                                <div className={`text-[9px] font-bold ${isSelected ? 'text-rose-500' : 'text-slate-400'} uppercase tracking-tighter`}>{res.desc}</div>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 text-rose-500">
                                                    <CheckCircle size={16} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* 4. Performance & Localization */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <AdminDrawer.Section title="并发与性能" icon={Cpu}>
                            <AdminDrawer.Card className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">文本管线并发 (Text)</label>
                                    <input
                                        type="number"
                                        value={settings.performance.textConcurrency ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            setSettings(s => ({ ...s, performance: { ...s.performance, textConcurrency: val } }))
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">图像管线并发 (Image)</label>
                                    <input
                                        type="number"
                                        value={settings.performance.imageConcurrency ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            setSettings(s => ({ ...s, performance: { ...s.performance, imageConcurrency: val } }))
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        <AdminDrawer.Section title="输出语言偏好" icon={Globe}>
                            <AdminDrawer.Card className="space-y-2">
                                {LANGUAGES.map(lang => {
                                    const isSelected = settings.language === lang.value;
                                    return (
                                        <button
                                            key={lang.value}
                                            onClick={() => setSettings(s => ({ ...s, language: lang.value }))}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected
                                                ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                                : 'bg-slate-50 border-slate-100 hover:border-emerald-200 hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[9px] ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {lang.value.toUpperCase()}
                                                </div>
                                                <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>{lang.label}</span>
                                            </div>
                                            {isSelected && <Check size={14} className="text-emerald-500" strokeWidth={3} />}
                                        </button>
                                    );
                                })}
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>
                    </div>
                </div>
            </AdminDrawer>

            <ConfirmDialog
                isOpen={confirmAction.isOpen}
                title={confirmAction.type === 'save' ? "保存配置" : "重置默认"}
                message={confirmAction.type === 'save'
                    ? "确定要保存当前修改的全局配置吗？保存后所有新生成的任务将应用此配置。"
                    : "确定要重置所有配置为默认值吗？此操作不可撤销。"}
                onConfirm={confirmAction.type === 'save' ? performSave : performReset}
                onCancel={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                type={confirmAction.type === 'save' ? 'info' : 'danger'}
            />
        </>
    );
};
