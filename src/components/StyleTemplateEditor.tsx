import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    ChevronDown,
    Monitor,
    Home,
    LayoutList,
    BookOpen,
    Flag,
    FileDigit,
    Layout,
    LayoutTemplate,
    AlertTriangle,
    AlertCircle,
    Wand2,
    Loader2
} from 'lucide-react';
import { generateStyleReference } from '../services/geminiService';
import { QuickTemplateModal } from './QuickTemplateModal';
import { ImageUploader } from './ImageUploader';
import { AIGlowContainer } from './AIGlowContainer';
import { StyleTemplate, PageType, StyleConfig, AppSettings } from '../types';
import { Home as HomeIcon, LayoutList as LayoutListIcon, BookOpen as BookOpenIcon, Flag as FlagIcon, Type, Wand2 as Wand2Icon, Edit3, Loader2 as Loader2Icon, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from '../constants';

interface StyleTemplateEditorProps {
    template: StyleTemplate;
    isEditing: boolean;
    onUpdateConfig: (key: any, value: any) => void;
    onUpdateStyleMap: (type: PageType, file: File | string | null) => void;
    onStructureChange: (type: PageType, value: number) => void;
    onSmartRefine?: (prompt: string) => void;
    isRefining?: boolean;
    setName?: (name: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
    appSettings: AppSettings;
}

const PAGE_TYPES: { type: PageType; label: string }[] = [
    { type: 'cover', label: '封面页' },
    { type: 'directory', label: '目录页' },
    { type: 'transition', label: '过渡页' },
    { type: 'content', label: '正文页' },
    { type: 'end', label: '结束页' },
];

const StructureItem: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
            <button
                onClick={() => onChange(Math.max(0, value - 1))}
                className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 transition-colors font-bold disabled:opacity-50"
            >
                -
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-800">{value}</span>
            <button
                onClick={() => onChange(Math.min(20, value + 1))}
                className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 transition-colors font-bold disabled:opacity-50"
            >
                +
            </button>
            <span className="text-xs font-bold text-slate-400 w-4">页</span>
        </div>
    </div>
);

export const StyleTemplateEditor: React.FC<StyleTemplateEditorProps> = ({
    template,
    isEditing,
    onUpdateConfig,
    onUpdateStyleMap,
    onStructureChange,
    onSmartRefine,
    isRefining = false,
    setName,
    onShowToast,
    appSettings,
}) => {
    const [customColor, setCustomColor] = useState<string>('');
    const [generatingTypes, setGeneratingTypes] = useState<Set<string>>(new Set());

    const getProviderName = (task: 'text' | 'image' | 'vision') => {
        if (appSettings.ai.provider === 'CustomCombo' && appSettings.ai.customCombo) {
            return 'Custom Combo';
        }
        return appSettings.ai.provider === 'Gemini' ? 'Google Gemini' : appSettings.ai.provider;
    };

    const handleGenerateAllReferences = async () => {
        if (!template.config.requirements) {
            alert("请先在下方填写“AI 视觉指令”");
            return;
        }

        const providerName = getProviderName('image');
        onShowToast(`调用 ${providerName} API 批量生成参考图中...`, 'info');

        // Sequential generation to avoid rate limits and better UX flow
        let hasGenerated = false;
        for (const pt of PAGE_TYPES) {
            // Optimization: Skip if already exists
            if (template.styleMap?.[pt.type]) {
                console.log(`[Generate All] Skipping ${pt.type} as it already exists.`);
                continue;
            }

            setGeneratingTypes(prev => new Set(prev).add(pt.type));
            hasGenerated = true;
            try {
                // Generate
                const imageUrl = await generateStyleReference(template.config, pt.type, appSettings);
                onUpdateStyleMap(pt.type, imageUrl as any);
                onShowToast(`${pt.label} 参考图生成成功`, 'success');

            } catch (error) {
                console.error(`Failed to generate for ${pt.type}`, error);
                onShowToast(`调用 ${providerName} API 失败 (${pt.label})`, 'error');
            } finally {
                setGeneratingTypes(prev => {
                    const next = new Set(prev);
                    next.delete(pt.type);
                    return next;
                });
            }
        }

        if (!hasGenerated) {
            onShowToast(`所有页面均已有参考图，无需生成`, 'info');
        }
    };

    const handleSingleGenerate = async (type: PageType) => {
        if (!template.config.requirements) {
            alert("请先在下方填写“AI 视觉指令”");
            return;
        }
        setGeneratingTypes(prev => new Set(prev).add(type));
        const label = PAGE_TYPES.find(p => p.type === type)?.label || '图片';

        const providerName = getProviderName('image');
        onShowToast(`调用 ${providerName} API 生成 ${label} 中...`, 'info');

        try {
            const imageUrl = await generateStyleReference(template.config, type, appSettings);
            onUpdateStyleMap(type, imageUrl as any);
            onShowToast(`${label} 生成成功`, 'success');
        } catch (error) {
            console.error(`Failed to generate for ${type}`, error);
            onShowToast(`调用 ${providerName} API 失败，请重试`, 'error');
        } finally {
            setGeneratingTypes(prev => {
                const next = new Set(prev);
                next.delete(type);
                return next;
            });
        }
    };

    // Local Stating for previewing the prompt
    const [isPromptPreview, setIsPromptPreview] = useState(false);

    // Page Count Validation Logic
    const currentStructureSum = Object.values(template.config.pageStructure).reduce((a, b) => a + b, 0);
    const isOverLimit = currentStructureSum > template.config.targetPageCount;
    const isUnderLimit = currentStructureSum < template.config.targetPageCount;

    return (
        <div className="w-full flex flex-col space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Basic Definition */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                    <Sparkles size={18} className="text-indigo-500" /> 基础定义
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">模板 ID <span className="text-xs text-slate-400 font-normal ml-2">(系统自动生成)</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            </div>
                            <input
                                type="text"
                                value={template.id || 'Generating...'}
                                readOnly
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-500 select-all focus:outline-none cursor-default"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">模板名称</label>
                        <input
                            type="text"
                            placeholder="例如：科技蓝商务演示..."
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all disabled:opacity-60 disabled:bg-slate-50"
                            value={template.name}
                            disabled={!isEditing}
                            onChange={(e) => setName && setName(e.target.value)}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">风格预设</label>
                        <div className="relative">
                            <select
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all disabled:opacity-60 disabled:bg-slate-50 cursor-pointer appearance-none"
                                value={STYLE_PRESETS.includes(template.config.styleName) ? template.config.styleName : '自定义'}
                                disabled={!isEditing}
                                onChange={(e) => {
                                    if (e.target.value !== '自定义') {
                                        onUpdateConfig('styleName', e.target.value);
                                    } else {
                                        if (STYLE_PRESETS.includes(template.config.styleName)) {
                                            onUpdateConfig('styleName', '');
                                        }
                                    }
                                }}
                            >
                                {STYLE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="自定义">自定义...</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <ChevronDown size={16} />
                            </div>
                        </div>

                        {(!STYLE_PRESETS.includes(template.config.styleName) || template.config.styleName === '' && isEditing) && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                                <input
                                    type="text"
                                    placeholder="输入自定义风格名称..."
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                    value={template.config.styleName}
                                    disabled={!isEditing}
                                    onChange={(e) => onUpdateConfig('styleName', e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. Style References */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h4 className="flex items-center justify-between gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Monitor size={18} className="text-blue-500" /> 视觉参考 (Style References)
                    </div>
                    {isEditing && (
                        <button
                            onClick={handleGenerateAllReferences}
                            disabled={generatingTypes.size > 0 || !template.config.requirements}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!template.config.requirements ? "请先填写下方视觉指令" : "AI 自动生成全套参考图"}
                        >
                            {generatingTypes.size > 0 ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            {generatingTypes.size > 0 ? '正在生成...' : '一键生成全套'}
                        </button>
                    )}
                </h4>

                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2 mb-6">
                    <span className="text-lg">💡</span>
                    <div className="mt-0.5">
                        为不同页面类型上传参考图，AI 将精准复刻设计风格。未上传的类型将自动使用“正文页”风格。
                    </div>
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-5 gap-4`}>
                    {PAGE_TYPES.map(pt => (
                        <div key={pt.type} className="space-y-2">
                            <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                                {pt.type === 'cover' ? <Home size={12} className="text-indigo-400" /> :
                                    pt.type === 'directory' ? <LayoutList size={12} className="text-indigo-400" /> :
                                        pt.type === 'transition' ? <BookOpen size={12} className="text-indigo-400" /> :
                                            pt.type === 'end' ? <Flag size={12} className="text-indigo-400" /> : <FileDigit size={12} className="text-indigo-400" />}
                                {pt.label}
                            </div>

                            <AIGlowContainer
                                isActive={generatingTypes.has(pt.type)}
                                className={`h-28 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all relative ${generatingTypes.has(pt.type) ? 'shadow-blue-500/10' : 'bg-slate-50 border border-slate-100'
                                    }`}
                            >
                                {generatingTypes.has(pt.type) && (
                                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                        <Loader2 size={24} className="animate-spin text-blue-500" />
                                        <span className="text-[10px] font-bold text-blue-500">生成中...</span>
                                    </div>
                                )}
                                <ImageUploader
                                    variant="style-ref"
                                    files={template.styleMap?.[pt.type] ? [template.styleMap[pt.type] as any] : []}
                                    onFilesSelected={(files) => onUpdateStyleMap(pt.type, files[0])}
                                    onRemoveFile={() => onUpdateStyleMap(pt.type, null)}
                                    label="点击上传"
                                    subLabel=""
                                    readOnly={!isEditing}
                                    onGenerate={isEditing ? () => handleSingleGenerate(pt.type) : undefined}
                                />
                            </AIGlowContainer>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Core Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
                    <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                        <Layout size={18} className="text-orange-500" /> 核心参数配置
                    </h4>
                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">画面比例</label>
                            <div className="flex flex-wrap gap-2">
                                {RATIO_PRESETS.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => isEditing && onUpdateConfig('aspectRatio', r)}
                                        disabled={!isEditing}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex-1 ${template.config.aspectRatio === r
                                            ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-slate-50'
                                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">配色方案</label>
                            <select
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all disabled:bg-slate-50 hover:bg-slate-50 cursor-pointer"
                                value={COLOR_PRESETS.includes(template.config.colorPalette) ? template.config.colorPalette : '自定义'}
                                disabled={!isEditing}
                                onChange={(e) => {
                                    if (e.target.value !== '自定义') {
                                        onUpdateConfig('colorPalette', e.target.value);
                                        setCustomColor('');
                                    } else {
                                        onUpdateConfig('colorPalette', '自定义');
                                    }
                                }}
                            >
                                {COLOR_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="自定义">自定义...</option>
                            </select>

                            {(!COLOR_PRESETS.includes(template.config.colorPalette) || template.config.colorPalette === '自定义') && (
                                <div className={`mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
                                    <div className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: customColor || '#ffffff' }}></div>
                                    <input
                                        type="text"
                                        placeholder="输入颜色代码或描述..."
                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all"
                                        value={COLOR_PRESETS.includes(template.config.colorPalette) ? customColor : template.config.colorPalette}
                                        onChange={(e) => {
                                            setCustomColor(e.target.value);
                                            onUpdateConfig('colorPalette', e.target.value);
                                        }}
                                        disabled={!isEditing}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
                    <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                        <FileDigit size={18} className="text-green-500" /> 结构规则
                    </h4>

                    <div className={`space-y-5 flex-1 ${!isEditing ? 'opacity-80 pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-sm font-bold text-slate-700">默认总页数</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" min={5} max={50}
                                    className="w-16 text-center bg-white border border-slate-200 rounded-lg py-1.5 text-sm font-black text-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
                                    value={template.config.targetPageCount}
                                    onChange={(e) => onUpdateConfig('targetPageCount', parseInt(e.target.value) || 10)}
                                    disabled={!isEditing}
                                />
                                <span className="text-xs font-bold text-slate-400">页</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">页面分布</p>
                            <StructureItem label="章节过渡页" value={template.config.pageStructure.transition} onChange={(v) => onStructureChange('transition', v)} />
                            <StructureItem label="核心正文页" value={template.config.pageStructure.content} onChange={(v) => onStructureChange('content', v)} />
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-lg opacity-60">
                                <span className="text-xs font-medium text-slate-500">固定配置</span>
                                <span className="text-xs font-bold text-slate-400">封面 + 目录 + 结束 (各 1 页)</span>
                            </div>

                            {/* Validation Message */}
                            {(isOverLimit || isUnderLimit) && (
                                <div className={`mt-2 text-xs flex items-start gap-2 p-3 rounded-lg border ${isOverLimit
                                    ? 'bg-red-50 text-red-600 border-red-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                    <div className="mt-0.5 shrink-0">
                                        {isOverLimit ? <AlertTriangle size={14} /> : <AlertCircle size={14} />}
                                    </div>
                                    <span className="font-medium">
                                        {isOverLimit
                                            ? `当前分配 (${currentStructureSum}页) 超出 默认总页数 (${template.config.targetPageCount}页)`
                                            : `当前分配 (${currentStructureSum}页) 少于 默认总页数 (${template.config.targetPageCount}页)`
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* 4. AI Prompt */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                <h4 className="flex items-center justify-between gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate size={18} className="text-purple-500" /> AI 视觉指令 (Prompt)
                    </div>
                    {template.config.requirements && (
                        <button
                            onClick={() => setIsPromptPreview(!isPromptPreview)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isPromptPreview
                                ? 'bg-purple-100 text-purple-600 font-bold'
                                : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                        >
                            {isPromptPreview ? <Edit3 size={12} /> : <Eye size={12} />}
                            {isPromptPreview ? '编辑' : '预览'}
                        </button>
                    )}
                </h4>

                <AIGlowContainer
                    isActive={isRefining}
                    className={`flex-1 min-h-[300px] flex flex-col ${isRefining ? 'shadow-lg shadow-purple-500/10' : ''}`}
                    colorFrom="#3b82f6"
                    colorTo="#a855f7"
                    duration={4}
                >
                    {isPromptPreview ? (
                        <div className="w-full h-full min-h-[300px] p-6 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto custom-scrollbar prose prose-sm prose-purple max-w-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-purple-100">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold text-slate-700 mt-4 mb-2 flex items-center gap-2"><div className="w-1 h-4 bg-purple-500 rounded-full"></div>{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold text-slate-700 mt-3 mb-1">{children}</h3>,
                                    p: ({ children }) => <p className="text-slate-600 mb-2 leading-relaxed text-sm">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-slate-600 text-sm marker:text-purple-400">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-600 text-sm marker:text-purple-500 font-medium">{children}</ol>,
                                }}
                            >
                                {template.config.requirements}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <textarea
                            className={`w-full h-full min-h-[300px] p-4 rounded-xl text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none transition-all font-mono ${isRefining
                                ? 'bg-slate-50 border-transparent' // Keep BG opaque, Beam is on top but pointer-events-none matches
                                : 'bg-slate-50 border border-slate-200'
                                }`}
                            placeholder="描述您期望的 PPT 视觉风格。例如：现代极简风格，使用大量留白，主色调为深蓝色，字体采用无衬线体，配图风格为写实商务照片..."
                            value={template.config.requirements}
                            disabled={!isEditing}
                            onChange={(e) => onUpdateConfig('requirements', e.target.value)}
                        />
                    )}

                    {isEditing && onSmartRefine && !isPromptPreview && (
                        <div className="absolute bottom-4 right-4 flex gap-2 z-30">
                            <button
                                onClick={() => onSmartRefine(template.config.requirements)}
                                disabled={isRefining || !template.config.requirements}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all active:scale-95"
                            >
                                <Sparkles size={14} className={isRefining ? "animate-spin" : ""} />
                                {isRefining ? "正在优化..." : "AI 智能润色"}
                            </button>
                        </div>
                    )}
                </AIGlowContainer>
            </section>
        </div>
    );
};
