
import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, Trash2, Wand2, ArrowRight, Loader2, Play, Check, FileText, Home, LayoutList, Flag, BookOpen } from 'lucide-react';
import { refinePrompt, generateOutline, generateSlideDetail } from '../services/geminiService';
import { OutlineItem, GeneratedSlide, StyleConfig, PageType } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface OutlineGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onFinish: (slides: GeneratedSlide[]) => void;
    initialTopic?: string;
    config: StyleConfig; // New: Pass global config
}

const getPageTypeLabel = (type: PageType) => {
    switch(type) {
        case 'cover': return '封面';
        case 'directory': return '目录';
        case 'end': return '结束';
        case 'transition': return '过渡';
        default: return '内容';
    }
}

export const OutlineGenerator: React.FC<OutlineGeneratorProps> = ({ isOpen, onClose, onFinish, initialTopic = "", config }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [topic, setTopic] = useState(initialTopic);
    const [isRefining, setIsRefining] = useState(false);
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
    
    useEffect(() => {
        setTopic(initialTopic);
    }, [initialTopic]);

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    if (!isOpen) return null;

    const handleRefine = async () => {
        if (!topic.trim()) return;
        setIsRefining(true);
        try {
            const refined = await refinePrompt(topic);
            setTopic(refined);
        } finally {
            setIsRefining(false);
        }
    };

    const handleGenerateOutline = async () => {
        if (!topic.trim()) return;
        setIsGeneratingOutline(true);
        try {
            // Pass config to enforce structure
            const items = await generateOutline(topic, config);
            setOutlineItems(items);
            setStep(2);
        } catch (error) {
            alert("生成大纲失败，请重试");
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleUpdateOutlineItem = (id: string, updates: Partial<OutlineItem>) => {
        setOutlineItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleDeleteOutlineItem = (id: string) => {
        setOutlineItems(prev => prev.filter(item => item.id !== id).map((item, idx) => ({ ...item, index: idx + 1 })));
    };

    const proceedToDetails = () => {
        setConfirmState({
            isOpen: true,
            title: "生成详细描述",
            message: "确定要基于当前大纲生成每个页面的详细内容吗？",
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                setStep(3);
            }
        });
    };

    const generateDetailForId = async (id: string) => {
        const item = outlineItems.find(i => i.id === id);
        if (!item) return;
        
        handleUpdateOutlineItem(id, { status: 'generating' });
        try {
            // UPDATE: Check page type. If it is structural, skip detail generation and use brief.
            const structuralTypes: PageType[] = ['cover', 'directory', 'transition', 'end'];
            
            if (structuralTypes.includes(item.pageType)) {
                // For structural pages, use the brief as the full content to remain concise
                await new Promise(resolve => setTimeout(resolve, 300)); // Simulate slight delay
                handleUpdateOutlineItem(id, { fullContent: item.brief, status: 'success' });
            } else {
                // For content pages, generate detailed text
                const detail = await generateSlideDetail(item.title, item.brief, topic);
                handleUpdateOutlineItem(id, { fullContent: detail, status: 'success' });
            }
        } catch (e) {
            handleUpdateOutlineItem(id, { status: 'error' });
        }
    };

    const handleBatchGenerateDetails = async () => {
        setIsGeneratingDetails(true);
        const pendingItems = outlineItems; 
        
        const promises = pendingItems.map(async (item) => {
            if (item.status === 'success' && item.fullContent) return; 
            await generateDetailForId(item.id);
        });

        await Promise.all(promises);
        setIsGeneratingDetails(false);
    };

    const handleFinish = () => {
        setConfirmState({
            isOpen: true,
            title: "生成 PPT",
            message: `确定要将这 ${outlineItems.length} 页内容导入工作台吗？\n(当前全局设定总页数为 ${config.targetPageCount} 页)`,
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                
                const slides: GeneratedSlide[] = outlineItems.map(item => ({
                    id: Math.random().toString(36).substr(2, 9),
                    contentType: 'text',
                    originalFile: null,
                    pageType: item.pageType, // Pass the type
                    title: item.title,
                    textContent: item.fullContent || item.brief,
                    previewUrl: '',
                    variants: [],
                    variantCount: 2,
                    status: 'idle',
                    createdAt: Date.now()
                }));
                
                onFinish(slides);
                onClose();
            }
        });
    };

    // Construct the description string
    const structureDesc = [
        `${config.pageStructure.cover}封面`,
        `${config.pageStructure.directory}目录`,
        config.pageStructure.transition > 0 ? `${config.pageStructure.transition}过渡` : null,
        `${config.pageStructure.content}内容`,
        `${config.pageStructure.end}结束`
    ].filter(Boolean).join('+');

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <ConfirmDialog 
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                type="info"
            />

            <div className="bg-[#fafafa] rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative border border-white/20">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        {/* Stepper UI ... */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= 1 ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md' : 'bg-slate-100 text-slate-400'}`}>1</div>
                        <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${step > 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= 2 ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md' : 'bg-slate-100 text-slate-400'}`}>2</div>
                        <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${step > 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= 3 ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md' : 'bg-slate-100 text-slate-400'}`}>3</div>
                        
                        <div className="ml-6 flex flex-col">
                            <span className="font-bold text-slate-800 text-lg leading-tight">
                                {step === 1 && "主题与内容输入"}
                                {step === 2 && "大纲结构梳理"}
                                {step === 3 && "内容细节生成"}
                            </span>
                            <span className="text-xs text-slate-400">
                                全局设定: {config.targetPageCount}页 ({structureDesc})
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                    {/* Step 1 ... (Same as before) */}
                    {step === 1 && (
                        <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 relative group focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                                <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-500"/> 
                                    输入 PPT 主题或粘贴内容
                                </label>
                                <textarea 
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="请输入 PPT 主题，例如：'关于2025年人工智能发展趋势的商业路演'，或者上传文件后在此处查看识别内容..."
                                    className="w-full h-64 p-4 text-base resize-none outline-none text-slate-700 placeholder:text-slate-300 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white transition-colors"
                                />
                                <div className="flex justify-between items-center mt-4">
                                     <span className="text-xs text-slate-400">系统将按照全局设置的 {config.targetPageCount} 页结构生成</span>
                                     <div className="flex gap-2">
                                        <button 
                                            onClick={() => setTopic('')}
                                            className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            清空
                                        </button>
                                        <button 
                                            onClick={handleRefine}
                                            disabled={isRefining || !topic.trim()}
                                            className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 font-medium"
                                        >
                                            {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            AI 智能修饰
                                        </button>
                                     </div>
                                </div>
                            </div>
                            <div className="mt-10 w-full max-w-sm">
                                {isGeneratingOutline ? (
                                    <div className="text-center py-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                        <div className="flex items-center justify-center gap-3 text-indigo-600 mb-2">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="font-semibold">正在按照 {config.targetPageCount} 页结构生成...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleGenerateOutline}
                                        disabled={!topic.trim()}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                    >
                                        <Wand2 size={20} /> 一键生成 PPT 大纲
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2 ... */}
                    {step === 2 && (
                        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* ... Header logic similar, just updating grid content ... */}
                            <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#fafafa]/95 backdrop-blur-sm z-20 py-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">大纲预览</h3>
                                    <p className="text-sm text-slate-500">已生成 {outlineItems.length} 页 (目标 {config.targetPageCount} 页)</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleGenerateOutline} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-200 shadow-sm transition-all"><RefreshCw size={14} /> 重新生成</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                                {outlineItems.map((item, idx) => (
                                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col gap-3 relative">
                                        {/* Card Header with Type Badge */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                                    {item.index}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                                                    ${item.pageType === 'cover' ? 'bg-purple-50 text-purple-600' : 
                                                      item.pageType === 'directory' ? 'bg-orange-50 text-orange-600' :
                                                      item.pageType === 'end' ? 'bg-slate-800 text-white' :
                                                      item.pageType === 'transition' ? 'bg-teal-50 text-teal-600' :
                                                      'bg-indigo-50 text-indigo-500'}
                                                `}>
                                                    {getPageTypeLabel(item.pageType)}
                                                </span>
                                            </div>
                                            {/* ... Actions ... */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white pl-2">
                                                {/* ... buttons ... */}
                                                <button onClick={() => handleDeleteOutlineItem(item.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" title="删除"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        {/* Content Inputs */}
                                        <div className="space-y-3 mt-2">
                                            <input value={item.title} onChange={(e) => handleUpdateOutlineItem(item.id, { title: e.target.value })} className="w-full font-bold text-lg text-slate-800 border-b border-transparent focus:border-indigo-300 hover:border-slate-200 bg-transparent p-1 focus:outline-none transition-colors" />
                                            <textarea value={item.brief} onChange={(e) => handleUpdateOutlineItem(item.id, { brief: e.target.value })} className="w-full text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 focus:border-indigo-300 focus:bg-white focus:outline-none resize-none transition-all h-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3 ... (Same UI, just ensuring data flows) */}
                    {step === 3 && (
                        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#fafafa]/95 backdrop-blur-sm z-20 py-2">
                                <div><h3 className="text-xl font-bold text-slate-800">详细内容生成</h3><p className="text-sm text-slate-500">系统将为内容页生成详细演讲稿，结构页保持精简</p></div>
                                <button onClick={handleBatchGenerateDetails} disabled={isGeneratingDetails} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 font-medium">
                                    {isGeneratingDetails ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />} {isGeneratingDetails ? "生成中..." : "批量生成详细描述"}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                                {outlineItems.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-0 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                                        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className="bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded border border-slate-200 shrink-0">P{item.index}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.pageType === 'cover' ? 'bg-purple-50 text-purple-600' : item.pageType === 'content' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>{getPageTypeLabel(item.pageType)}</span>
                                                <span className="font-bold text-slate-800 truncate" title={item.title}>{item.title}</span>
                                            </div>
                                            {/* ... */}
                                        </div>
                                        <div className="relative p-4 flex-1 min-h-[240px] flex flex-col">
                                            {/* ... Text Area ... */}
                                            <textarea value={item.fullContent || ''} onChange={(e) => handleUpdateOutlineItem(item.id, { fullContent: e.target.value })} className="w-full h-full min-h-[220px] resize-none text-sm text-slate-700 leading-relaxed outline-none border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded-lg p-2 transition-all custom-scrollbar bg-transparent focus:bg-white" placeholder={item.pageType === 'content' ? "等待生成详细内容..." : "保持大纲简述"} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer ... (Same) */}
                <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-between items-center shrink-0 z-20">
                    <button onClick={() => setStep(prev => Math.max(1, prev - 1) as any)} disabled={step === 1} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium">上一步</button>
                    {step === 2 && <button onClick={proceedToDetails} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold active:scale-95">下一步：生成详细描述 <ArrowRight size={18} /></button>}
                    {step === 3 && <button onClick={handleFinish} className="flex items-center gap-2 bg-rose-500 text-white px-8 py-2.5 rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 font-bold active:scale-95">下一步：生成 PPT <Check size={18} /></button>}
                </div>
            </div>
        </div>
    );
};
