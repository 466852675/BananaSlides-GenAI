
import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Image as ImageIcon, Globe, Save, RotateCcw, Server, FileText, Eye } from 'lucide-react';
import { AppSettings, AIProvider, ImageResolution, OutputLanguage, CustomComboConfig } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: AppSettings;
    onSave: (settings: AppSettings) => void;
}

const PROVIDERS: { label: string; value: AIProvider }[] = [
    { label: 'Google Gemini', value: 'Gemini' },
    { label: 'OpenAI', value: 'OpenAI' },
    { label: '智谱 AI (Zhipu)', value: 'Zhipu' },
    { label: '硅基流动 (SiliconFlow)', value: 'SiliconFlow' },
    { label: '魔塔社区 (ModelScope)', value: 'ModelScope' },
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
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        models: { text: 'gemini-3-pro-preview', image: 'gemini-2.5-flash-image', vision: 'gemini-3-pro-preview' }
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
    }
};

const RESOLUTIONS: { label: string; value: ImageResolution; desc: string }[] = [
    { label: '1K', value: '1024x1024', desc: '1024px' },
    { label: '2K', value: '2048x2048', desc: '2048px (默认)' },
    { label: '4K', value: '4096x4096', desc: '4096px' },
];

const LANGUAGES: { label: string; value: OutputLanguage }[] = [
    { label: '简体中文', value: 'zh' },
    { label: 'English', value: 'en' },
    { label: '日本語', value: 'ja' },
    { label: '自动检测', value: 'auto' },
];

const DEFAULT_COMBO_CONFIG: CustomComboConfig = {
    text: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: '',
        model: 'glm-4.7'
    },
    image: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: '',
        model: 'gemini-3-pro-image-2k-16x9'
    },
    vision: {
        baseUrl: 'https://api.siliconflow.cn/v1',
        apiKey: '',
        model: 'GLM-4.1V-9B-Thinking'
    }
};

// Updated Default: Gemini with Gemini 3 Pro Preview
export const DEFAULT_SETTINGS: AppSettings = {
    ai: {
        provider: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: '', // Empty by default, triggers internal fallback
        models: {
            text: 'gemini-3-pro-preview',
            image: 'gemini-2.5-flash-image',
            vision: 'gemini-3-pro-preview'
        },
        customCombo: DEFAULT_COMBO_CONFIG
    },
    imageGeneration: {
        resolution: '2048x2048'
    },
    performance: {
        textConcurrency: undefined, // Unlimited by default
        imageConcurrency: undefined // Unlimited by default
    },
    language: 'zh'
};

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [settings, setSettings] = useState<AppSettings>(currentSettings);
    const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'reset', isOpen: boolean }>({ type: 'save', isOpen: false });

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
        const preset = PROVIDER_PRESETS[provider];
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
        setSettings(DEFAULT_SETTINGS);
        setConfirmAction({ ...confirmAction, isOpen: false });
        setTimeout(() => alert('✅ 全局配置已重置为默认值！'), 100);
    };

    const performSave = () => {
        onSave(settings);
        setConfirmAction({ ...confirmAction, isOpen: false });
        onClose();
        setTimeout(() => alert('✅ 全局配置保存成功并已生效！'), 100);
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
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div className="flex items-center gap-2 text-slate-800">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Settings size={20} className="text-slate-600" />
                            </div>
                            <h3 className="font-bold text-lg">全局配置</h3>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 px-3 py-1 text-sm font-medium hover:bg-slate-50 rounded-lg transition-colors">
                            关闭
                        </button>
                    </div>

                    {/* Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6 space-y-6">
                        
                        {/* 1. Model Configuration */}
                        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                <Server size={18} className="text-indigo-500" /> 模型配置
                            </h4>
                            
                            {/* Provider Select */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">AI 提供商</label>
                                <div className="flex flex-wrap gap-2">
                                    {PROVIDERS.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => handleProviderChange(p.value)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                                settings.ai.provider === p.value 
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Config Area */}
                            {isCombo ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Text Settings */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                                        <h5 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                                            <FileText size={16} className="text-indigo-500"/> 文本生成 (Text)
                                        </h5>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">API Base URL</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.customCombo?.text.baseUrl || ''}
                                                onChange={(e) => updateComboSettings('text', 'baseUrl', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none"
                                                placeholder="https://api.openai.com/v1 或 http://localhost:8000/v1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                                            <input 
                                                type="password" 
                                                value={settings.ai.customCombo?.text.apiKey || ''}
                                                onChange={(e) => updateComboSettings('text', 'apiKey', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none font-mono"
                                                placeholder="sk-..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">模型名称 (Model)</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.customCombo?.text.model || ''}
                                                onChange={(e) => updateComboSettings('text', 'model', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none font-bold text-slate-700"
                                                placeholder="e.g. glm-4.7"
                                            />
                                        </div>
                                    </div>

                                    {/* Image Settings */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                                        <h5 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                                            <ImageIcon size={16} className="text-rose-500"/> 图像生成 (Image)
                                        </h5>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">API Base URL</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.customCombo?.image.baseUrl || ''}
                                                onChange={(e) => updateComboSettings('image', 'baseUrl', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none"
                                                placeholder="https://... 或 http://host.docker.internal:8045/v1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                                            <input 
                                                type="password" 
                                                value={settings.ai.customCombo?.image.apiKey || ''}
                                                onChange={(e) => updateComboSettings('image', 'apiKey', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none font-mono"
                                                placeholder="sk-..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">模型名称 (Model)</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.customCombo?.image.model || ''}
                                                onChange={(e) => updateComboSettings('image', 'model', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none font-bold text-slate-700"
                                                placeholder="e.g. gemini-3-pro-image-2k-16x9"
                                            />
                                        </div>
                                    </div>

                                    {/* Vision Settings */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                                        <h5 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                                            <Eye size={16} className="text-green-500"/> 图片识别 (Vision)
                                        </h5>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">API Base URL</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.customCombo?.vision.baseUrl || ''}
                                                onChange={(e) => updateComboSettings('vision', 'baseUrl', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none"
                                                placeholder="https://... 或 http://localhost:8000/v1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                                            <input 
                                                type="password" 
                                                value={settings.ai.customCombo?.vision.apiKey || ''}
                                                onChange={(e) => updateComboSettings('vision', 'apiKey', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none font-mono"
                                                placeholder="sk-..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">模型名称 (Model)</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.customCombo?.vision.model || ''}
                                                onChange={(e) => updateComboSettings('vision', 'model', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-200 focus:outline-none font-bold text-slate-700"
                                                placeholder="e.g. GLM-4V"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* API Credentials */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">API Base URL</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.baseUrl || ''}
                                                onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, baseUrl: e.target.value } }))}
                                                placeholder="https://api.example.com/v1"
                                                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                            <input 
                                                type="password" 
                                                value={settings.ai.apiKey || ''}
                                                onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, apiKey: e.target.value } }))}
                                                placeholder={settings.ai.provider === 'Gemini' ? "(默认使用内置 Key，无需填写)" : "sk-..."}
                                                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Model Names */}
                                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">文本生成模型 (Text)</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.models.text || ''}
                                                onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, text: e.target.value } } }))}
                                                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-400"
                                                placeholder="例如: gpt-4-turbo, glm-4..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">图像生成模型 (Image)</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.models.image || ''}
                                                onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, image: e.target.value } } }))}
                                                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-400"
                                                placeholder="例如: dall-e-3, cogview-3..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">图片识别模型 (Vision)</label>
                                            <input 
                                                type="text" 
                                                value={settings.ai.models.vision || ''}
                                                onChange={(e) => setSettings(s => ({ ...s, ai: { ...s.ai, models: { ...s.ai.models, vision: e.target.value } } }))}
                                                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-400"
                                                placeholder="例如: gpt-4-vision-preview, glm-4v..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 2. Image Generation Config */}
                        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                <ImageIcon size={18} className="text-rose-500" /> 图像生成配置
                            </h4>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">生成分辨率</label>
                                <div className="flex gap-4">
                                    {RESOLUTIONS.map(res => (
                                        <label key={res.value} className={`flex-1 relative cursor-pointer group`}>
                                            <input 
                                                type="radio" 
                                                name="resolution" 
                                                value={res.value} 
                                                checked={settings.imageGeneration.resolution === res.value}
                                                onChange={() => setSettings(s => ({ ...s, imageGeneration: { resolution: res.value } }))}
                                                className="peer sr-only" 
                                            />
                                            <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-700 transition-all text-center">
                                                <div className="font-bold text-lg mb-1">{res.label}</div>
                                                <div className="text-xs text-slate-500 peer-checked:text-rose-600/80">{res.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* 3. Performance & Language */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Performance */}
                            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                 <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Cpu size={18} className="text-blue-500" /> 性能配置
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700">描述生成最大并发数</label>
                                        <input 
                                            type="number" min={1} max={50}
                                            value={settings.performance.textConcurrency ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                setSettings(s => ({ ...s, performance: { ...s.performance, textConcurrency: val } }))
                                            }}
                                            placeholder="无限制"
                                            className="w-24 p-2 border border-slate-200 rounded text-center text-sm font-bold placeholder:font-normal placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-700">图像生成最大并发数</label>
                                        <input 
                                            type="number" min={1} max={20}
                                            value={settings.performance.imageConcurrency ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                setSettings(s => ({ ...s, performance: { ...s.performance, imageConcurrency: val } }))
                                            }}
                                            placeholder="无限制"
                                            className="w-24 p-2 border border-slate-200 rounded text-center text-sm font-bold placeholder:font-normal placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Language */}
                            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                 <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                                    <Globe size={18} className="text-green-500" /> 输出语言设置
                                </h4>
                                <div className="space-y-3">
                                    {LANGUAGES.map(lang => (
                                        <label key={lang.value} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="radio" 
                                                    name="language" 
                                                    value={lang.value}
                                                    checked={settings.language === lang.value}
                                                    onChange={() => setSettings(s => ({ ...s, language: lang.value }))}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">{lang.label}</span>
                                            </div>
                                            {settings.language === lang.value && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                        </label>
                                    ))}
                                </div>
                            </section>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                        <button 
                            onClick={handleResetClick}
                            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium"
                        >
                            <RotateCcw size={16} /> 重置默认
                        </button>
                        <button 
                            onClick={handleSaveClick}
                            className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-200 transition-all font-bold active:scale-95"
                        >
                            <Save size={18} /> 保存配置
                        </button>
                    </div>
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
        </>
    );
};
