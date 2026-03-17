import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Bot, Plus, Zap, Trash2, Power, Edit3, Check, X, Save,
    CircuitBoard, Sparkles, Eye, EyeOff, ShieldCheck, AlertTriangle,
    FileText, Image, Gauge, Globe, ChevronDown, ChevronRight,
    Settings2, Cpu, Database, Loader2
} from 'lucide-react';
import {
    AiEngineRule,
    AiEngineRuleConfig,
    GlobalAiConfig,
    getAiEngineRules,
    createAiEngineRule,
    updateAiEngineRule,
    activateAiEngineRule,
    deleteAiEngineRule,
    PROVIDER_PRESETS,
    RESOLUTION_PRESETS,
    RESOLUTION_OPTIONS,
    LANGUAGE_PRESETS,
} from '../../api/admin';
import { useAppSettingsMasked, useUpdateAppSettings } from '../../api/settings';
import toast from 'react-hot-toast';
import { AdminDrawer } from './shared';
import { ConfirmDialog } from '../ConfirmDialog';
import { refreshOutputModeCache } from '../../services/geminiService';

// ============================================================
// 类型定义
// ============================================================

type ActiveTab = 'rules' | 'global';

interface RuleFormData {
    name: string;
    provider: string;
    description: string;
    config: AiEngineRuleConfig;
}

const getProviderColor = (provider: string) => {
    const found = PROVIDER_PRESETS.find(p => p.value === provider);
    return found?.color || 'slate';
};

const getProviderIcon = (provider: string) => {
    const found = PROVIDER_PRESETS.find(p => p.value === provider);
    return found?.icon || '⚙️';
};

// ============================================================
// 折叠面板组件
// ============================================================


// ============================================================
// 规则卡片组件
// ============================================================

interface RuleCardProps {
    rule: AiEngineRule;
    isActive: boolean;
    onActivate: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isActivating: boolean;
    isDeleting: boolean;
}

const RuleCard: React.FC<RuleCardProps> = ({
    rule, isActive, onActivate, onEdit, onDelete, isActivating, isDeleting
}) => {
    const color = getProviderColor(rule.provider);
    const icon = getProviderIcon(rule.provider);
    let parsedConfig: AiEngineRuleConfig | null = null;
    try { parsedConfig = JSON.parse(rule.config); } catch { }

    const colorClasses: Record<string, string> = {
        violet: 'bg-violet-500/10 border-violet-500/30 text-violet-600',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
        emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
        cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600',
        purple: 'bg-purple-500/10 border-purple-500/30 text-purple-600',
        slate: 'bg-slate-500/10 border-slate-500/30 text-slate-600',
        amber: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
    };

    const activeRingClass = isActive
        ? 'ring-2 ring-green-500 ring-offset-2 bg-gradient-to-br from-green-50 to-emerald-50'
        : 'hover:shadow-lg';

    return (
        <div className={`relative bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-sm transition-all duration-300 ${activeRingClass}`}>
            {isActive && (
                <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                    <ShieldCheck size={12} />
                    运行中
                </div>
            )}

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colorClasses[color] || colorClasses.slate}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{rule.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses[color] || colorClasses.slate}`}>
                            {PROVIDER_PRESETS.find(p => p.value === rule.provider)?.label || rule.provider}
                        </span>
                    </div>
                </div>
            </div>

            {rule.description && (
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{rule.description}</p>
            )}

            {parsedConfig && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">

                    {rule.provider === 'CustomCombo' && parsedConfig.combo && (
                        <div className="space-y-1">
                            {parsedConfig.combo.text?.model && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Sparkles size={12} className="text-violet-500" />
                                    <span className="text-slate-500">Text:</span>
                                    <span className="font-mono text-slate-700 truncate" title={parsedConfig.combo.text.model}>{parsedConfig.combo.text.model}</span>
                                </div>
                            )}
                            {parsedConfig.combo.image?.model && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Image size={12} className="text-fuchsia-500" />
                                    <span className="text-slate-500">Image:</span>
                                    <span className="font-mono text-slate-700 truncate" title={parsedConfig.combo.image.model}>{parsedConfig.combo.image.model}</span>
                                </div>
                            )}
                            {parsedConfig.combo.vision?.model && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Eye size={12} className="text-indigo-500" />
                                    <span className="text-slate-500">Vision:</span>
                                    <span className="font-mono text-slate-700 truncate" title={parsedConfig.combo.vision.model}>{parsedConfig.combo.vision.model}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {rule.provider !== 'CustomCombo' && (
                        <>
                            {parsedConfig.textModel && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Sparkles size={12} className="text-violet-500" />
                                    <span className="text-slate-500">Text:</span>
                                    <span className="font-mono text-slate-700 truncate">{parsedConfig.textModel}</span>
                                </div>
                            )}
                            {parsedConfig.imageModel && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Image size={12} className="text-fuchsia-500" />
                                    <span className="text-slate-500">Image:</span>
                                    <span className="font-mono text-slate-700 truncate">{parsedConfig.imageModel}</span>
                                </div>
                            )}
                            {parsedConfig.visionModel && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Eye size={12} className="text-indigo-500" />
                                    <span className="text-slate-500">Vision:</span>
                                    <span className="font-mono text-slate-700 truncate">{parsedConfig.visionModel}</span>
                                </div>
                            )}
                        </>
                    )}

                </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                {!isActive && (
                    <button
                        onClick={onActivate}
                        disabled={isActivating}
                        className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                        {isActivating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Power size={14} />}
                        激活
                    </button>
                )}
                <button
                    onClick={onEdit}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                    <Edit3 size={14} />
                    编辑
                </button>
                {!isActive && (
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <Trash2 size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================
// 规则编辑抽屉
// ============================================================

interface RuleEditorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    rule?: AiEngineRule | null;
    onSave: (data: RuleFormData) => void;
    isSaving: boolean;
}

const RuleEditorDrawer: React.FC<RuleEditorDrawerProps> = ({
    isOpen, onClose, rule, onSave, isSaving
}) => {
    const isEdit = !!rule;

    const emptyConfig: AiEngineRuleConfig = {
        apiKey: '', baseUrl: '', textModel: '', imageModel: '', visionModel: '',
        combo: { text: { baseUrl: '', apiKey: '', model: '' }, image: { baseUrl: '', apiKey: '', model: '' }, vision: { baseUrl: '', apiKey: '', model: '' } }
    };

    const [formData, setFormData] = useState<RuleFormData>({
        name: '', provider: 'Gemini', description: '', config: emptyConfig
    });

    // Manage visibility for multiple API keys (main + combo keys)
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    const toggleKey = (key: string) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        // Reset state only when drawer OPENS
        if (isOpen) {
            if (rule) {
                let parsed = emptyConfig;
                try { parsed = { ...emptyConfig, ...JSON.parse(rule.config) }; } catch { }
                setFormData({ name: rule.name, provider: rule.provider, description: rule.description || '', config: parsed });
            } else {
                setFormData({ name: '', provider: 'Gemini', description: '', config: emptyConfig });
            }
            setShowKeys({}); // Reset visibility
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.config.apiKey) {
            // For CustomCombo, main apiKey might be empty/unused, but let's keep validation simple or adjust if needed.
            // Actually CustomCombo uses combo.*.apiKey, main config.apiKey might be ignored.
            // But existing logic checks config.apiKey. Let's respect it or improve it, but for now just keeping existing check unless it blocks CustomCombo.
            // If provider is CustomCombo, maybe we shouldn't block on main apiKey?
            // Let's leave validation as is for now to avoid side effects, user only asked for Eye Icon.
            if (formData.provider !== 'CustomCombo' && !formData.config.apiKey) {
                toast.error('请填写 API Key');
                return;
            }
            if (!formData.name.trim()) {
                toast.error('请填写规则名称');
                return;
            }
        }
        onSave(formData);
    };

    const updateConfig = (path: string, value: string) => {
        const parts = path.split('.');
        setFormData(prev => {
            const newConfig = { ...prev.config };
            let current: any = newConfig;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
            return { ...prev, config: newConfig };
        });
    };

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? '编辑规则' : '新建规则'}
            description={isEdit ? 'Update AI Routing & Model Parameters' : 'Register New AI Model Engine'}
            width="narrow"
            footer={
                <div className="flex items-center gap-4 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm tracking-widest uppercase"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex-[2] py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-violet-500/25 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                正在同步
                            </>
                        ) : (
                            <>
                                {isEdit ? <Save size={18} /> : <Plus size={18} />}
                                {isEdit ? '保存更改' : '创建规则'}
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <AdminDrawer.HeadCard
                title={isEdit ? '调优现有规则' : '构建新路由规则'}
                description="Configuration for AI Model Routing & Params"
                icon={CircuitBoard}
                variant="primary"
            />

            <div className="space-y-8">
                <AdminDrawer.Section title="基础信息与路由" icon={CircuitBoard}>
                    <AdminDrawer.Card className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">规则名称 *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-300"
                                placeholder="例: 生产环境 Gemini"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">厂商</label>
                                <select
                                    value={formData.provider}
                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-violet-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {PROVIDER_PRESETS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">描述</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                                    placeholder="选填描述..."
                                />
                            </div>
                        </div>
                    </AdminDrawer.Card>
                </AdminDrawer.Section>

                {formData.provider !== 'CustomCombo' && (
                    <AdminDrawer.Section title="模型连接 (Model Link)" icon={Zap}>
                        <AdminDrawer.Card className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">API Key *</label>
                                <div className="relative group">
                                    <input
                                        type={showKeys['main'] ? "text" : "password"}
                                        value={formData.config.apiKey}
                                        onChange={e => updateConfig('apiKey', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-rose-500 outline-none transition-all font-mono"
                                        placeholder="sk-..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleKey('main')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    >
                                        {showKeys['main'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Base URL</label>
                                <input
                                    type="text"
                                    value={formData.config.baseUrl || ''}
                                    onChange={e => updateConfig('baseUrl', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                                    placeholder="https://api.example.com"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { field: 'textModel', label: 'Text', color: 'violet' },
                                    { field: 'imageModel', label: 'Image', color: 'fuchsia' },
                                    { field: 'visionModel', label: 'Vision', color: 'indigo' }
                                ].map(m => (
                                    <div key={m.field}>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 ml-1">{m.label}</label>
                                        <input
                                            type="text"
                                            value={(formData.config as any)[m.field] || ''}
                                            onChange={e => updateConfig(m.field as any, e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>
                )}

                {formData.provider === 'CustomCombo' && (
                    <AdminDrawer.Section title="CustomCombo 组合配置" icon={Settings2}>
                        <div className="space-y-4">
                            {(['text', 'image', 'vision'] as const).map(task => (
                                <AdminDrawer.Card key={task} className="space-y-3">
                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{task === 'text' ? '文本生成 (Text)' : task === 'image' ? '图像生成 (Image)' : '视觉识别 (Vision)'}</div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <input
                                            type="text"
                                            value={formData.config.combo?.[task]?.baseUrl || ''}
                                            onChange={e => updateConfig(`combo.${task}.baseUrl`, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                                            placeholder="Base URL"
                                        />
                                        <div className="relative group">
                                            <input
                                                type={showKeys[`combo.${task}`] ? "text" : "password"}
                                                value={formData.config.combo?.[task]?.apiKey || ''}
                                                onChange={e => updateConfig(`combo.${task}.apiKey`, e.target.value)}
                                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-rose-500 outline-none transition-all font-mono"
                                                placeholder="API Key"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleKey(`combo.${task}`)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                            >
                                                {showKeys[`combo.${task}`] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.config.combo?.[task]?.model || ''}
                                            onChange={e => updateConfig(`combo.${task}.model`, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                                            placeholder="Model Name"
                                        />
                                    </div>
                                </AdminDrawer.Card>
                            ))}
                        </div>
                    </AdminDrawer.Section>
                )}
            </div>
        </AdminDrawer>
    );
};

// ============================================================
// 基础配置编辑抽屉
// ============================================================

interface GlobalConfigDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: GlobalAiConfig;
    onSave: (config: GlobalAiConfig) => void;
    isSaving: boolean;
}

const GlobalConfigDrawer: React.FC<GlobalConfigDrawerProps> = ({
    isOpen, onClose, currentConfig, onSave, isSaving
}) => {
    const [formData, setFormData] = useState<GlobalAiConfig>(currentConfig);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(currentConfig);
            setShowKey(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); // Only reset when drawer opens to prevent overwriting user input on background refetch

    const handleSubmit = () => {
        onSave(formData);
    };

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title="基础配置"
            description="System-wide AI Service & Performance Tuning"
            width="narrow"
            footer={
                <div className="flex items-center gap-4 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm tracking-widest uppercase"
                    >
                        取消返回
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex-[2] py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-indigo-500/25 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                正在同步
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                保存配置
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <AdminDrawer.HeadCard
                title="系统运行参数"
                description="Global AI Performance & Parser Settings"
                icon={Settings2}
                variant="info"
            />

            <div className="space-y-8">
                <AdminDrawer.Section title="文档深度解析 (PDF/Docx)" icon={FileText}>
                    <AdminDrawer.Card className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">解析服务商</label>
                            <select
                                value={formData.docParser.provider}
                                onChange={e => setFormData({ ...formData, docParser: { ...formData.docParser, provider: e.target.value } })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="MinerU">MinerU (Industrial Grade)</option>
                                <option value="Custom">Custom Adapter</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">API Key</label>
                            <div className="relative group">
                                <input
                                    type={showKey ? "text" : "password"}
                                    value={formData.docParser.apiKey}
                                    onChange={e => setFormData({ ...formData, docParser: { ...formData.docParser, apiKey: e.target.value } })}
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-rose-500 outline-none transition-all font-mono"
                                    placeholder="eyJ..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                >
                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Base URL (Endpoint)</label>
                            <input
                                type="text"
                                value={formData.docParser.baseUrl}
                                onChange={e => setFormData({ ...formData, docParser: { ...formData.docParser, baseUrl: e.target.value } })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                                placeholder="https://api.parser.com"
                            />
                        </div>
                    </AdminDrawer.Card>
                </AdminDrawer.Section>

                <AdminDrawer.Section title="默认图像规格" icon={Image}>
                    <AdminDrawer.Card>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">推荐分辨率 (Aspect Ratio 16:9)</label>
                        <select
                            value={formData.imageResolution}
                            onChange={e => setFormData({ ...formData, imageResolution: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            {RESOLUTION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </AdminDrawer.Card>
                </AdminDrawer.Section>

                <AdminDrawer.Section title="高级并发能力控制" icon={Gauge}>
                    <AdminDrawer.Card className="space-y-8">
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">文本生成并发</label>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Text Pump Concurrency</p>
                                </div>
                                <span className="text-2xl font-black text-indigo-600 tabular-nums leading-none">{formData.textConcurrency}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={formData.textConcurrency}
                                onChange={e => setFormData({ ...formData, textConcurrency: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">
                                <span>Low</span>
                                <span>Turbo (20)</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">图像生成并发</label>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Image Pump Concurrency</p>
                                </div>
                                <span className="text-2xl font-black text-violet-600 tabular-nums leading-none">{formData.imageConcurrency}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={formData.imageConcurrency}
                                onChange={e => setFormData({ ...formData, imageConcurrency: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">
                                <span>Safety</span>
                                <span>Max (10)</span>
                            </div>
                        </div>
                    </AdminDrawer.Card>
                </AdminDrawer.Section>

                <AdminDrawer.Section title="内容输出语言本地化" icon={Globe}>
                    <div className="grid grid-cols-2 gap-3">
                        {LANGUAGE_PRESETS.map(lang => (
                            <button
                                key={lang.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, outputLanguage: lang.value as GlobalAiConfig['outputLanguage'] })}
                                className={`px-4 py-3 rounded-2xl text-sm font-black tracking-tight transition-all border-2 ${formData.outputLanguage === lang.value
                                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-lg shadow-rose-100/50'
                                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </AdminDrawer.Section>

                <AdminDrawer.Section title="AI 输出方式" icon={Zap}>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, outputMode: 'stream' })}
                            className={`px-4 py-3 rounded-2xl text-sm font-black tracking-tight transition-all border-2 ${
                                formData.outputMode === 'stream'
                                    ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-lg shadow-violet-100/50'
                                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            流式输出
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, outputMode: 'complete' })}
                            className={`px-4 py-3 rounded-2xl text-sm font-black tracking-tight transition-all border-2 ${
                                formData.outputMode === 'complete'
                                    ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-lg shadow-violet-100/50'
                                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            完整输出
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 font-bold">
                        流式输出：AI 内容逐字/逐项显示，响应更快。完整输出：等待全部生成后一次性显示。
                    </p>
                </AdminDrawer.Section>
            </div>
        </AdminDrawer>
    );
};

// ============================================================
// 主组件
// ============================================================

export const AICoreEngine: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<ActiveTab>('rules');
    const [isRuleEditorOpen, setIsRuleEditorOpen] = useState(false);
    const [isGlobalEditorOpen, setIsGlobalEditorOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AiEngineRule | null>(null);

    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        rule: AiEngineRule | null;
    }>({
        isOpen: false,
        rule: null
    });

    // 规则数据
    const { data: rules = [], isLoading: isLoadingRules, error: rulesError } = useQuery({
        queryKey: ['ai-engine-rules'],
        queryFn: getAiEngineRules,
    });

    // 全局配置
    const { data: appSettings, isLoading: isLoadingSettings } = useAppSettingsMasked();
    const updateSettingsMutation = useUpdateAppSettings();

    // 从 AppSettings 提取全局 AI 配置
    const globalConfig: GlobalAiConfig = React.useMemo(() => ({
        docParser: {
            provider: appSettings?.docParser?.provider || 'MinerU',
            apiKey: appSettings?.docParser?.apiKey || '',
            baseUrl: appSettings?.docParser?.baseUrl || 'https://mineru.net',
        },
        imageResolution: appSettings?.imageGeneration?.resolution || '2048x2048',
        textConcurrency: appSettings?.performance?.textConcurrency ?? 1,
        imageConcurrency: appSettings?.performance?.imageConcurrency ?? 2,
        outputLanguage: appSettings?.language || 'zh',
        outputMode: appSettings?.outputMode || 'stream',
    }), [appSettings]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: createAiEngineRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-engine-rules'] });
            toast.success('规则创建成功！');
            setIsRuleEditorOpen(false);
        },
        onError: (err: any) => toast.error(err.message || '创建失败')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateAiEngineRule(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-engine-rules'] });
            toast.success('规则更新成功！');
            setIsRuleEditorOpen(false);
            setEditingRule(null);
        },
        onError: (err: any) => toast.error(err.message || '更新失败')
    });

    const activateMutation = useMutation({
        mutationFn: activateAiEngineRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-engine-rules'] });
            toast.success('规则已激活！');
        },
        onError: (err: any) => toast.error(err.message || '激活失败')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAiEngineRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-engine-rules'] });
            toast.success('规则已删除');
        },
        onError: (err: any) => toast.error(err.message || '删除失败')
    });

    const handleSaveRule = (data: RuleFormData) => {
        if (editingRule) {
            updateMutation.mutate({ id: editingRule.id, data: { name: data.name, provider: data.provider, description: data.description, config: data.config } });
        } else {
            createMutation.mutate({ name: data.name, provider: data.provider, description: data.description, config: data.config });
        }
    };

    const handleSaveGlobalConfig = (config: GlobalAiConfig) => {
        if (!appSettings) return;
        const newSettings = {
            ...appSettings,
            // Map GlobalAiConfig back to AppSettings root structure
            docParser: config.docParser,
            imageGeneration: {
                ...appSettings.imageGeneration,
                resolution: config.imageResolution
            },
            performance: {
                textConcurrency: config.textConcurrency,
                imageConcurrency: config.imageConcurrency
            },
            language: config.outputLanguage,
            outputMode: config.outputMode,

            // Also keep it in ai.global for backward compatibility if needed,
            // but the Service reads from root.
            ai: {
                ...appSettings.ai,
                global: config
            }
        };
        updateSettingsMutation.mutate(newSettings, {
            onSuccess: () => {
                toast.success('基础配置保存成功！');
                setIsGlobalEditorOpen(false);
                // 刷新 outputMode 缓存，确保后续 AI 调用使用最新配置
                refreshOutputModeCache().catch(() => { /* 忽略错误 */ });
            },
            onError: (err: any) => toast.error(err.message || '保存失败')
        });
    };

    const handleEditRule = (rule: AiEngineRule) => {
        setEditingRule(rule);
        setIsRuleEditorOpen(true);
    };

    const handleDeleteRule = (rule: AiEngineRule) => {
        setDeleteDialog({ isOpen: true, rule });
    };

    const confirmDelete = () => {
        if (deleteDialog.rule) {
            deleteMutation.mutate(deleteDialog.rule.id, {
                onSuccess: () => setDeleteDialog({ isOpen: false, rule: null })
            });
        }
    };

    const activeRule = rules.find(r => r.isActive);
    const isLoading = isLoadingRules || isLoadingSettings;

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    if (rulesError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
                <AlertTriangle className="text-red-500" size={24} />
                <div>
                    <h3 className="font-bold text-red-700">加载失败</h3>
                    <p className="text-red-600 text-sm">{(rulesError as any).message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-6 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">AI 引擎配置中心</h1>
                            <p className="text-violet-100 font-medium opacity-90">
                                管理多套 AI 模型配置，配置全局生成参数。
                            </p>
                        </div>
                    </div>
                    {activeTab === 'rules' && (
                        <button
                            onClick={() => { setEditingRule(null); setIsRuleEditorOpen(true); }}
                            className="px-5 py-2.5 bg-white text-violet-600 rounded-xl shadow-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} />
                            新建规则
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'rules' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Cpu size={16} />
                    模型配置
                </button>
                <button
                    onClick={() => setActiveTab('global')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'global' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings2 size={16} />
                    基础配置
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'rules' && (
                <>
                    {/* Active Rule Hero */}
                    {activeRule && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-lg text-xl">
                                    {getProviderIcon(activeRule.provider)}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">当前激活规则</div>
                                    <h2 className="text-xl font-black text-slate-800">{activeRule.name}</h2>
                                </div>
                            </div>
                            {(() => {
                                try {
                                    const config = JSON.parse(activeRule.config);

                                    if (activeRule.provider === 'CustomCombo' && config.combo) {
                                        return (
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-white/60 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 mb-1">Text Model</div>
                                                    <div className="font-mono text-sm font-bold text-slate-700 truncate" title={config.combo.text?.model}>{config.combo.text?.model || '-'}</div>
                                                </div>
                                                <div className="bg-white/60 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 mb-1">Image Model</div>
                                                    <div className="font-mono text-sm font-bold text-slate-700 truncate" title={config.combo.image?.model}>{config.combo.image?.model || '-'}</div>
                                                </div>
                                                <div className="bg-white/60 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 mb-1">Vision Model</div>
                                                    <div className="font-mono text-sm font-bold text-slate-700 truncate" title={config.combo.vision?.model}>{config.combo.vision?.model || '-'}</div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white/60 rounded-xl p-3">
                                                <div className="text-xs text-slate-500 mb-1">Text Model</div>
                                                <div className="font-mono text-sm font-bold text-slate-700 truncate">{config.textModel || '-'}</div>
                                            </div>
                                            <div className="bg-white/60 rounded-xl p-3">
                                                <div className="text-xs text-slate-500 mb-1">Image Model</div>
                                                <div className="font-mono text-sm font-bold text-slate-700 truncate">{config.imageModel || '-'}</div>
                                            </div>
                                            <div className="bg-white/60 rounded-xl p-3">
                                                <div className="text-xs text-slate-500 mb-1">Vision Model</div>
                                                <div className="font-mono text-sm font-bold text-slate-700 truncate">{config.visionModel || '-'}</div>
                                            </div>
                                        </div>
                                    );
                                } catch { return null; }
                            })()}
                        </div>
                    )}

                    {/* Rules Grid */}
                    {rules.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                            <Bot size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-600 mb-2">暂无规则</h3>
                            <p className="text-slate-400 mb-4">点击上方「新建规则」创建第一条配置。</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...rules]
                                .sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1))
                                .map(rule => (
                                    <RuleCard
                                        key={rule.id}
                                        rule={rule}
                                        isActive={rule.isActive}
                                        onActivate={() => activateMutation.mutate(rule.id)}
                                        onEdit={() => handleEditRule(rule)}
                                        onDelete={() => handleDeleteRule(rule)}
                                        isActivating={activateMutation.isPending && activateMutation.variables === rule.id}
                                        isDeleting={deleteMutation.isPending && deleteMutation.variables === rule.id}
                                    />
                                ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'global' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Database size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">全局基础配置</h3>
                                <p className="text-sm text-slate-500">文档解析、图像生成、性能并发、输出语言</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsGlobalEditorOpen(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Edit3 size={16} />
                            编辑
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                <FileText size={14} />
                                文档解析
                            </div>
                            <div className="font-bold text-slate-800">{globalConfig.docParser.provider}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                <Image size={14} />
                                图像分辨率
                            </div>
                            <div className="font-bold text-slate-800">
                                {RESOLUTION_OPTIONS.find(r => r.value === globalConfig.imageResolution)?.label || globalConfig.imageResolution}
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                <Gauge size={14} />
                                并发配置
                            </div>
                            <div className="font-bold text-slate-800">T:{globalConfig.textConcurrency} / I:{globalConfig.imageConcurrency}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                <Globe size={14} />
                                输出语言
                            </div>
                            <div className="font-bold text-slate-800">{LANGUAGE_PRESETS.find(l => l.value === globalConfig.outputLanguage)?.label || globalConfig.outputLanguage}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                <Zap size={14} />
                                AI 输出方式
                            </div>
                            <div className="font-bold text-slate-800">{globalConfig.outputMode === 'stream' ? '流式输出' : '完整输出'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Drawers */}
            <RuleEditorDrawer
                isOpen={isRuleEditorOpen}
                onClose={() => { setIsRuleEditorOpen(false); setEditingRule(null); }}
                rule={editingRule}
                onSave={handleSaveRule}
                isSaving={createMutation.isPending || updateMutation.isPending}
            />
            <GlobalConfigDrawer
                isOpen={isGlobalEditorOpen}
                onClose={() => setIsGlobalEditorOpen(false)}
                currentConfig={globalConfig}
                onSave={handleSaveGlobalConfig}
                isSaving={updateSettingsMutation.isPending}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="确认删除规则"
                message={`确定要删除规则「${deleteDialog.rule?.name}」吗？此操作不可恢复。`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialog({ isOpen: false, rule: null })}
                type="danger"
                confirmText="删除"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};
