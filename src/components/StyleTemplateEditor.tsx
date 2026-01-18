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
    AlertCircle
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { StyleTemplate, PageType } from '../types';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from '../constants';

interface StyleTemplateEditorProps {
    template: StyleTemplate;
    isEditing: boolean;
    onUpdateConfig: (key: any, value: any) => void;
    onUpdateStyleMap: (type: PageType, file: File | null) => void;
    onStructureChange: (type: PageType, value: number) => void;
    onSmartRefine?: (prompt: string) => void;
    isRefining?: boolean;
    setName?: (name: string) => void;
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
}) => {
    const [customColor, setCustomColor] = useState<string>('');

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
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                    <Monitor size={18} className="text-blue-500" /> 视觉参考 (Style References)
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
                            <div className="h-28 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <ImageUploader
                                    variant="style-ref"
                                    files={template.styleMap?.[pt.type] ? [template.styleMap[pt.type] as any] : []}
                                    onFilesSelected={(files) => onUpdateStyleMap(pt.type, files[0])}
                                    onRemoveFile={() => onUpdateStyleMap(pt.type, null)}
                                    label="点击上传"
                                    subLabel=""
                                    readOnly={!isEditing}
                                />
                            </div>
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
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-6 pb-3 border-b border-slate-100">
                    <LayoutTemplate size={18} className="text-purple-500" /> AI 视觉指令 (Prompt)
                </h4>

                <div className="relative group flex-1 min-h-[300px]">
                    <textarea
                        className="w-full h-full min-h-[300px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none transition-all"
                        placeholder="描述您期望的 PPT 视觉风格。例如：现代极简风格，使用大量留白，主色调为深蓝色，字体采用无衬线体，配图风格为写实商务照片..."
                        value={template.config.requirements}
                        disabled={!isEditing}
                        onChange={(e) => onUpdateConfig('requirements', e.target.value)}
                    />

                    {isEditing && onSmartRefine && (
                        <div className="absolute bottom-4 right-4 flex gap-2">
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
                </div>
            </section>
        </div>
    );
};
