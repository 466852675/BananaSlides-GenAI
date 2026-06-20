
import React, { useRef, useState } from 'react';
import { GeneratedSlide, PageType } from '../types';
import { downloadImage } from '../utils';
import { exportToPdf, exportToPptx } from '../services/exportService';
import { Download, Loader2, AlertCircle, Clock, FileText, Image as ImageIcon, GripVertical, RefreshCw, Zap, Edit, Upload, Maximize2, Layers, Trash2, Copy, BookOpen, Flag, Home, LayoutList, FileOutput, FileType, Sparkles, Eye, Edit3, Undo2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PointsBadge } from './PointsBadge';
import { AIGlowContainer } from './AIGlowContainer';

interface ResultCardProps {
    item: GeneratedSlide;
    index?: number;
    onClick?: () => void;
    selected?: boolean;
    onToggleSelect?: () => void;
    onDragStart?: () => void;
    onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop?: () => void;
    onGenerateSingle?: () => void;
    onRegenerate?: () => void;
    onUpdate?: (updates: Partial<GeneratedSlide>) => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onViewImage?: (imageUrl: string) => void;
    onRefineContent?: (text: string, onChunk?: (chunk: string) => void) => Promise<string>;
    readOnly?: boolean;
    onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'success': return '完成';
        case 'generating': return '生成中';
        case 'error': return '错误';
        case 'idle': return '待生成';
        default: return '等待中';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'success': return 'bg-green-100 text-green-700';
        case 'generating': return 'bg-yellow-100 text-yellow-700';
        case 'error': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-600';
    }
}

// Updated Grid Logic for strict containment
const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1 grid-rows-1';
    if (count === 2) return 'grid-cols-2 grid-rows-1';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-3 grid-rows-3'; // Max 9
};

const getPageTypeIcon = (type: PageType) => {
    switch (type) {
        case 'cover': return <Home size={12} />;
        case 'directory': return <LayoutList size={12} />;
        case 'end': return <Flag size={12} />;
        case 'transition': return <BookOpen size={12} />;
        default: return <FileText size={12} />;
    }
}

const getPageTypeLabel = (type: PageType) => {
    switch (type) {
        case 'cover': return '封面页';
        case 'directory': return '目录页';
        case 'end': return '结束页';
        case 'transition': return '过渡页';
        default: return '内容页';
    }
}

export const ResultCard: React.FC<ResultCardProps> = ({
    item,
    index,
    onClick,
    selected,
    onToggleSelect,
    onDragStart,
    onDragOver,
    onDrop,
    onGenerateSingle,
    onRegenerate,
    onUpdate,
    onDelete,
    onDuplicate,
    onViewImage,
    onRefineContent,
    readOnly = false,
    onShowConfirm
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRefining, setIsRefining] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false); // Add preview mode state

    const isTextType = item.contentType === 'text';
    const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        if (e.target.files && e.target.files[0] && onUpdate) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            onUpdate({
                originalFile: file,
                previewUrl: url
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleVariantCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (readOnly) return;
        if (onUpdate) {
            onUpdate({ variantCount: parseInt(e.target.value) });
        }
    };

    const handleSingleExport = async (type: 'pdf' | 'pptx', variantUrl: string) => {
        // 单页导出不扣积分，直接导出
        const tempItem = { ...item, variants: [variantUrl] };
        const filename = `slide-${index || 'x'}-${item.title || 'export'}`;

        try {
            if (type === 'pdf') {
                await exportToPdf([tempItem], filename);
            } else {
                await exportToPptx([tempItem], filename);
            }
        } catch (error: any) {
            console.error("Single export failed", error);
            alert("导出失败，请重试");
        }
    };

    const handleSmartRefine = async () => {
        if (!onRefineContent || !item.textContent || isRefining || readOnly) return;

        const originalContent = item.textContent;  // 修饰前快照
        setIsRefining(true);
        // 存旧值供撤回（必须在流式覆盖 textContent 之前）
        if (onUpdate) {
            onUpdate({ previousContent: originalContent });
        }

        let accumulatedText = originalContent;

        try {
            const refined = await onRefineContent(item.textContent, (chunk) => {
                // 流式更新：实时更新 textarea 内容
                accumulatedText += chunk;
                if (onUpdate) {
                    onUpdate({ textContent: accumulatedText });
                }
            });
            // 最终确认（确保内容完整）
            if (onUpdate && refined) {
                onUpdate({ textContent: refined });
            }
        } catch (error) {
            console.error("Refine failed", error);
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div
            className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-all hover:shadow-md relative group/card
        ${selected ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'}
      `}
            onClick={onClick}
            draggable={!readOnly && !!onDragStart}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {/* Header Bar */}
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    {!readOnly && onDragStart && (
                        <div className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing p-1">
                            <GripVertical size={16} />
                        </div>
                    )}

                    {onToggleSelect && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => onToggleSelect()}
                                className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2 overflow-hidden">
                        {index !== undefined && (
                            <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                P{index.toString().padStart(2, '0')}
                            </span>
                        )}

                        {/* Page Type Badge */}
                        <span className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded font-medium border shrink-0
                    ${item.pageType === 'cover' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                item.pageType === 'directory' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    item.pageType === 'end' ? 'bg-slate-800 text-white border-slate-700' :
                                        item.pageType === 'transition' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }
                 `}>
                            {getPageTypeIcon(item.pageType)} {getPageTypeLabel(item.pageType)}
                        </span>

                        <div className={`p-1 rounded shrink-0 ${isTextType ? 'bg-slate-50 text-slate-500' : 'bg-blue-50 text-blue-500'}`}>
                            {isTextType ? <FileText size={12} /> : <ImageIcon size={12} />}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate">
                            {isTextType ? "文本素材" : "图片素材"}
                        </span>
                    </div>
                </div>
                <div className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${getStatusColor(item.status)}`}>
                    {getStatusLabel(item.status)}
                </div>
            </div>

            {/* Split Content Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[350px]">

                {/* Left: Source Content */}
                <div className="p-4 bg-slate-50/30 flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">输入内容</div>
                        <div className="flex items-center gap-2">
                            {/* Preview Toggle */}
                            {isTextType && item.textContent && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsPreviewMode(!isPreviewMode); }}
                                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${isPreviewMode
                                        ? 'bg-indigo-100 text-indigo-600 font-medium'
                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                                        }`}
                                    title={isPreviewMode ? "切换编辑" : "切换预览"}
                                >
                                    {isPreviewMode ? <Edit3 size={11} /> : <Eye size={11} />}
                                    {isPreviewMode ? '编辑' : '预览'}
                                </button>
                            )}
                        </div>
                    </div>

                    <AIGlowContainer
                        isActive={isRefining}
                        className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden relative group flex flex-col"
                        colorFrom="#6366f1"
                        colorTo="#a855f7"
                    >
                        {/* Unified Title Input */}
                        <div className="border-b border-slate-100">
                            <input
                                type="text"
                                className="w-full p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-indigo-50/20 placeholder:text-slate-300 disabled:bg-white disabled:text-slate-600"
                                value={item.title || ''}
                                onChange={(e) => !readOnly && onUpdate && onUpdate({ title: e.target.value })}
                                placeholder={readOnly ? "无标题" : "请输入页面标题..."}
                                disabled={readOnly}
                            />
                        </div>

                        {/* Content Body */}
                        <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col">
                            {isTextType ? (
                                // Text Content Logic
                                <>
                                    {isPreviewMode && item.textContent ? (
                                        <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar prose prose-sm prose-slate max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ children }) => <h1 className="text-xl font-bold text-slate-800 mb-2 pb-1 border-b">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-lg font-bold text-slate-700 mt-2 mb-1">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-base font-semibold text-slate-700 mt-2 mb-1">{children}</h3>,
                                                    p: ({ children }) => <p className="text-slate-600 mb-2 leading-relaxed text-sm">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-slate-600 text-sm">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-600 text-sm">{children}</ol>,
                                                    img: ({ src, alt }) => {
                                                        if (src?.startsWith('data:image')) {
                                                            return <img src={src} alt={alt || 'image'} className="max-w-full h-auto rounded-md my-2 border border-slate-100 shadow-sm" style={{ maxHeight: '160px' }} />;
                                                        }
                                                        return <span className="text-xs text-slate-400 block my-1">[图片: {alt}]</span>;
                                                    }
                                                }}
                                            >
                                                {item.textContent}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <textarea
                                            className="w-full h-full p-3 text-sm text-slate-600 resize-none focus:outline-none focus:bg-indigo-50/20 transition-all custom-scrollbar disabled:bg-white"
                                            value={item.textContent || ''}
                                            onChange={(e) => !readOnly && onUpdate && onUpdate({ textContent: e.target.value, previousContent: undefined })}
                                            placeholder={readOnly ? "无内容" : "在此输入正文内容..."}
                                            disabled={readOnly}
                                        />
                                    )}
                                    {!readOnly && onRefineContent && (
                                        <button
                                            onClick={handleSmartRefine}
                                            disabled={isRefining || !item.textContent}
                                            className={`absolute bottom-2 right-2 p-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-medium transition-all shadow-sm
                                          ${!item.textContent
                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-0 group-hover:opacity-100'
                                                    : isRefining
                                                        ? 'bg-indigo-50 text-indigo-400 cursor-wait'
                                                        : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100 hover:shadow-md'
                                                }
                                      `}
                                            title="AI 智能修饰"
                                        >
                                            {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {isRefining ? '修饰中...' : 'AI 修饰'}
                                            {!isRefining && <PointsBadge actionCode="smart_refine" compact showIcon={false} className="ml-1" />}
                                        </button>
                                    )}

                                    {item.previousContent && !isRefining && !readOnly && onUpdate && (
                                        <button
                                            onClick={() => onUpdate({ textContent: item.previousContent!, previousContent: undefined })}
                                            className="absolute bottom-2 right-[5.5rem] p-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-medium transition-all shadow-sm bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:shadow-md opacity-0 group-hover:opacity-100"
                                            title="撤回修饰"
                                        >
                                            <Undo2 size={12} />
                                            撤回修饰
                                        </button>
                                    )}
                                </>
                            ) : (
                                // Image Content Logic
                                <div className="relative w-full h-full group/image">
                                    <img src={item.previewUrl} className="w-full h-full object-contain bg-slate-100" alt="source content" />
                                    {!readOnly && onUpdate && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="bg-white/90 hover:bg-white text-slate-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 shadow-lg transition-all"
                                            >
                                                <Upload size={14} /> 更换图片
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </AIGlowContainer>
                </div>

                {/* Right: Status / Result */}
                <div className="p-4 bg-white flex flex-col relative h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {item.status === 'success' ? '生成结果' : '输出内容'}
                            </span>

                            {/* Variant Count Selector */}
                            <div className={`flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 ${readOnly ? 'opacity-70' : ''}`}>
                                <Layers size={10} className="text-slate-500" />
                                <select
                                    value={item.variantCount}
                                    onChange={handleVariantCountChange}
                                    className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                                    disabled={readOnly || item.status === 'generating'}
                                >
                                    <option value={1}>1 张</option>
                                    <option value={2}>2 张</option>
                                    <option value={4}>4 张</option>
                                </select>
                            </div>
                        </div>

                        {!readOnly && (
                            <div className="flex items-center gap-1">
                                {/* Duplicate Button */}
                                {onDuplicate && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                                        className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all"
                                        title="复制此页"
                                    >
                                        <Copy size={14} />
                                    </button>
                                )}

                                {/* Delete Button */}
                                {onDelete && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                        className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                        title="删除此页"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}

                                <div className="w-px h-4 bg-slate-200 mx-1"></div>

                                {(item.status === 'idle' || item.status === 'error') && onGenerateSingle && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onGenerateSingle(); }}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs font-medium transition-all border border-rose-100 shadow-sm"
                                        title="仅生成此页"
                                    >
                                        <Zap size={12} /> 生成 <PointsBadge actionCode="slide_image" multiplier={item.variantCount} compact showIcon={false} className="ml-0.5" />
                                    </button>
                                )}

                                {item.status === 'success' && onRegenerate && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 text-xs font-medium transition-all shadow-sm"
                                        title="重新生成此页"
                                    >
                                        <RefreshCw size={12} /> 重试
                                    </button>
                                )}

                                {item.status === 'generating' && onGenerateSingle && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onGenerateSingle(); }}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 text-xs font-medium transition-all border border-amber-200 shadow-sm"
                                        title="此页生成状态异常，点击重新生成"
                                    >
                                        <RefreshCw size={12} /> 重新生成
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <AIGlowContainer
                        isActive={item.status === 'generating'}
                        className="flex-1 relative rounded-lg border border-dashed border-slate-100 bg-slate-50/50 overflow-hidden min-h-0"
                        colorFrom="#f43f5e"
                        colorTo="#fb923c"
                    >
                        {/* Idle State */}
                        {item.status === 'idle' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                    <Clock size={20} className="text-slate-300" />
                                </div>
                                <span className="text-sm">等待生成 ({item.variantCount} 张)...</span>
                            </div>
                        )}

                        {/* Generating State */}
                        {item.status === 'generating' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-500 gap-3 z-10 bg-white/80 backdrop-blur-sm">
                                <Loader2 size={28} className="animate-spin" />
                                <div className="text-center">
                                    <span className="text-sm font-medium">AI 设计中...</span>
                                    <p className="text-xs text-slate-400 mt-1">正在生成 {item.variantCount} 个方案</p>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {item.status === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-2 p-4 text-center">
                                <AlertCircle size={24} />
                                <span className="text-sm font-medium">生成失败</span>
                                <span className="text-xs text-slate-400 max-w-[200px]">{item.errorMessage}</span>
                            </div>
                        )}

                        {/* Success State - Dynamic Strict Grid */}
                        {item.status === 'success' && item.variants && (
                            <div className={`grid gap-2 h-full w-full p-2 ${getGridClass(item.variants.length)}`}>
                                {item.variants.map((variant, idx) => (
                                    <div
                                        key={idx}
                                        className="relative group/img border border-slate-200 rounded overflow-hidden bg-slate-100 w-full h-full min-h-0 min-w-0"
                                        onMouseEnter={() => setActiveVariantIndex(idx)}
                                        onMouseLeave={() => setActiveVariantIndex(null)}
                                    >
                                        <div className="absolute top-1 left-1 z-10 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm pointer-events-none">
                                            {idx + 1}
                                        </div>

                                        <img
                                            src={variant}
                                            className="w-full h-full object-contain cursor-zoom-in"
                                            alt={`Variant ${idx + 1}`}
                                            onClick={() => onViewImage && onViewImage(variant)}
                                        />


                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-end justify-end gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">

                                            <div className="flex items-center gap-1 mr-auto">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSingleExport('pdf', variant); }}
                                                    className="bg-white/20 hover:bg-white/40 text-white p-1 rounded-full backdrop-blur-md transition-colors"
                                                    title="导出 PDF"
                                                >
                                                    <FileType size={10} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSingleExport('pptx', variant); }}
                                                    className="bg-white/20 hover:bg-white/40 text-white p-1 rounded-full backdrop-blur-md transition-colors"
                                                    title="导出 PPTX"
                                                >
                                                    <FileOutput size={10} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewImage && onViewImage(variant); }}
                                                className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-md transition-colors"
                                                title="查看大图"
                                            >
                                                <Maximize2 size={10} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); downloadImage(variant, `slide-${item.id}-${idx + 1}.png`); }}
                                                className="bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full backdrop-blur-md transition-colors shadow-sm"
                                                title="下载图片 (PNG)"
                                            >
                                                <Download size={10} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </AIGlowContainer>
                </div>
            </div>
        </div>
    );
};
