
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Settings, Cpu, Image as ImageIcon, Globe, Save, RotateCcw, Server, FileText, Eye, X, Zap, Sparkles, Database, Crown, Clock, ShieldAlert, Check, Layout, Code, Lock, CheckCircle } from 'lucide-react';
import { AppSettings, AIProvider, ImageResolution, OutputLanguage, CustomComboConfig, EnvPreset } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { useResetSettings } from '../api/settings';

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

// Updated Default: Gemini with Gemini 3 Pro Preview
export const DEFAULT_SETTINGS: AppSettings = {
    ai: {
        provider: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: '', // Empty by default, triggers internal fallback
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
        textConcurrency: 1, // Default to 1 for maximum stability (prevents ModelScope 401s)
        imageConcurrency: 2 // Safe default for image generation
    },
    language: 'zh'
};

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave, readOnly = false, showToast }) => {
    const [settings, setSettings] = useState<AppSettings>(currentSettings);
    const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'reset', isOpen: boolean }>({ type: 'save', isOpen: false });
    const resetMutation = useResetSettings();

    // Sync when modal opens
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

    if (!isOpen) return null;

    const handleProviderChange = (provider: AIProvider) => {
        // Priority: Backend Env Preset (from currentSettings) > Frontend Hardcoded Preset
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
                // 保持弹窗打开，让用户可以继续调整配置
                showToast?.('配置已重置为默认值', 'success');
            }
        });
    };

    const performSave = () => {
        onSave(settings);
        setConfirmAction({ ...confirmAction, isOpen: false });
        // 保持弹窗打开，让用户可以继续调整配置
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

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className={`relative w-full max-w-4xl bg-slate-50 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ${readOnly ? 'opacity-90' : ''}`}>

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">全局系统配置</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Global Engine Settings</span>
                                {readOnly && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black border border-amber-200/50 uppercase">
                                        <Eye size={10} /> Read Only
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-32 custom-scrollbar">
                    {/* 1. Model Configuration */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                <Server size={18} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">AI 内核模型配置 (Infrastructure)</h4>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-8">
                            {/* Provider Select */}
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">AI 核心供应商 (Primary Provider)</label>
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

                            {/* Config Area */}
                            {isCombo ? (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                                        <Zap className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <div className="text-xs text-amber-800 leading-relaxed">
                                            <p className="font-black mb-1">自定义混合模式 (Mixed Mode Strategy)</p>
                                            您正在使用高级路由策略。系统将为不同原子任务调度独立的 API 实例。
                                            <span className="font-bold underline ml-1">注意：若单项配置留空，将自动降级至默认集群。</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Text Settings */}
                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-sm">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="text-xs font-black text-slate-800">文本层 (Text)</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Endpoint</span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.customCombo?.text.baseUrl || ''}
                                                        onChange={(e) => updateComboSettings('text', 'baseUrl', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                                                        placeholder="URL..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Model</span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.customCombo?.text.model || ''}
                                                        onChange={(e) => updateComboSettings('text', 'model', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                                                        placeholder="Model..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Image Settings */}
                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white shadow-sm">
                                                    <ImageIcon size={16} />
                                                </div>
                                                <span className="text-xs font-black text-slate-800">渲染层 (Image)</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Endpoint</span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.customCombo?.image.baseUrl || ''}
                                                        onChange={(e) => updateComboSettings('image', 'baseUrl', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none transition-all"
                                                        placeholder="URL..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Model</span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.customCombo?.image.model || ''}
                                                        onChange={(e) => updateComboSettings('image', 'model', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none transition-all"
                                                        placeholder="Model..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vision Settings */}
                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                                                    <Eye size={16} />
                                                </div>
                                                <span className="text-xs font-black text-slate-800">感知层 (Vision)</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Endpoint</span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.customCombo?.vision.baseUrl || ''}
                                                        onChange={(e) => updateComboSettings('vision', 'baseUrl', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                                                        placeholder="URL..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Model</span>
                                                    <input
                                                        type="text"
                                                        value={settings.ai.customCombo?.vision.model || ''}
                                                        onChange={(e) => updateComboSettings('vision', 'model', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                                                        placeholder="Model..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">API 基础路径 (Base URL)</label>
                                            <div className="relative group">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    value={settings.ai.baseUrl || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, baseUrl: e.target.value } }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                                                    placeholder="https://api.example.com/v1"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">验证凭证 (API Key)</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    value={settings.ai.apiKey || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, apiKey: e.target.value } }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 outline-none transition-all font-mono"
                                                    placeholder={settings.ai.provider === 'Gemini' ? "使用内置密钥" : "sk-..."}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-5">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">集群映射 (Model Mapping)</h5>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 items-center gap-4">
                                                <span className="text-[11px] font-bold text-slate-500">
                                                    <FileText size={14} className="inline mr-2 text-indigo-400" />
                                                    文本生成
                                                </span>
                                                <input
                                                    type="text"
                                                    value={settings.ai.models.text || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, text: e.target.value } } }))}
                                                    className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 items-center gap-4">
                                                <span className="text-[11px] font-bold text-slate-500">
                                                    <ImageIcon size={14} className="inline mr-2 text-rose-400" />
                                                    图像创作
                                                </span>
                                                <input
                                                    type="text"
                                                    value={settings.ai.models.image || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, image: e.target.value } } }))}
                                                    className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 items-center gap-4">
                                                <span className="text-[11px] font-bold text-slate-500">
                                                    <Eye size={14} className="inline mr-2 text-emerald-400" />
                                                    多模态感知
                                                </span>
                                                <input
                                                    type="text"
                                                    value={settings.ai.models.vision || ''}
                                                    onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, vision: e.target.value } } }))}
                                                    className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Document Parser (MinerU) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                                <Code size={18} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">结构化文档解析 (Doc Parser)</h4>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 flex items-start gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                                <div className="w-10 h-10 shrink-0 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-500">
                                    <Sparkles size={20} />
                                </div>
                                <div className="text-xs text-orange-800 leading-relaxed">
                                    <p className="font-black mb-1">使用 MinerU (Magic-PDF) 解析器</p>
                                    工业级 PDF 转 Markdown 工具。配置后将启用结构化提取，极大提升长文本解析精度。
                                    <a href="https://mineru.net" target="_blank" rel="noreferrer" className="font-bold underline ml-2 hover:text-orange-600 transition-colors">获取 API Token &gt;</a>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                                    Parser Endpoint
                                    <span className="text-[10px] text-slate-400 normal-case font-normal">(支持粘贴官方完整接口地址，系统将自动清洗)</span>
                                </label>
                                <input
                                    type="text"
                                    value={settings.docParser?.baseUrl || 'https://mineru.net'}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        docParser: { ...s.docParser, baseUrl: e.target.value, provider: 'MinerU' }
                                    }))}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all font-mono"
                                    placeholder="https://mineru.net"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">MinerU Token</label>
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
                    </div>

                    {/* 3. Multimedia & Generation */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                                <ImageIcon size={18} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">图像生成分辨率 (Resolution)</h4>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                            <div className="grid grid-cols-3 gap-4">
                                {RESOLUTIONS.map(res => {
                                    const isSelected = settings.imageGeneration.resolution === res.value;
                                    return (
                                        <button
                                            key={res.value}
                                            onClick={() => setSettings(s => ({ ...s, imageGeneration: { resolution: res.value } }))}
                                            className={`relative group p-6 rounded-[2rem] border-2 transition-all text-left overflow-hidden ${isSelected
                                                ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-100'
                                                : 'bg-slate-50 border-slate-100 hover:border-rose-200 hover:bg-white'
                                                }`}
                                        >
                                            <div className="relative z-10">
                                                <div className={`text-lg font-black mb-1 ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>{res.label}</div>
                                                <div className={`text-[10px] font-bold ${isSelected ? 'text-rose-500' : 'text-slate-400'}`}>{res.desc}</div>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-4 right-4 text-rose-500">
                                                    <CheckCircle size={20} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 4. Performance & Localization */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Performance */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                    <Cpu size={18} strokeWidth={2.5} />
                                </div>
                                <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">并发与性能 (Concurrency)</h4>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">文本管线并发 (Text)</label>
                                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">RECOMMENDED: 10</span>
                                    </div>
                                    <div className="relative group">
                                        <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            value={settings.performance.textConcurrency ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                setSettings(s => ({ ...s, performance: { ...s.performance, textConcurrency: val } }))
                                            }}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                            placeholder="无限制 (Unlimited)"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">图像管线并发 (Image)</label>
                                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">STABLE: 2</span>
                                    </div>
                                    <div className="relative group">
                                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            value={settings.performance.imageConcurrency ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                setSettings(s => ({ ...s, performance: { ...s.performance, imageConcurrency: val } }))
                                            }}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-rose-500 outline-none transition-all"
                                            placeholder="无限制"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <Globe size={18} strokeWidth={2.5} />
                                </div>
                                <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">输出语言偏好 (Localization)</h4>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-3">
                                {LANGUAGES.map(lang => {
                                    const isSelected = settings.language === lang.value;
                                    return (
                                        <button
                                            key={lang.value}
                                            onClick={() => setSettings(s => ({ ...s, language: lang.value }))}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected
                                                ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                                : 'bg-slate-50 border-slate-100 hover:border-emerald-200 hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {lang.value.toUpperCase()}
                                                </div>
                                                <span className={`text-sm font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>{lang.label}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Sticky */}
                <div className="px-8 py-6 border-t border-slate-100 bg-white/80 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] sticky bottom-0 z-10 rounded-t-[2.5rem]">
                    {readOnly ? (
                        <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-widest text-xs w-full justify-center py-2">
                            <ShieldAlert size={18} className="text-amber-500" />
                            <span>Preview Only - Modifying Disabled</span>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>

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
        </div>,
        document.body
    );
};
