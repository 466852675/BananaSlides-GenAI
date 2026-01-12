
import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, Trash2, Wand2, ArrowRight, Loader2, Play, Check, FileText, ArrowLeft, Eraser } from 'lucide-react';
import { refinePrompt, generateOutline, generateSlideDetail, generateSingleOutlineItem } from '../services/geminiService';
import { OutlineItem, GeneratedSlide, StyleConfig, PageType, AppSettings } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { ToastMessage } from './Toast';

interface OutlineGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onFinish: (slides: GeneratedSlide[]) => void;
    initialTopic?: string;
    config: StyleConfig; 
    appSettings: AppSettings;
    onShowToast: (msg: string, type: ToastMessage['type']) => void;
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

export const OutlineGenerator: React.FC<OutlineGeneratorProps> = ({ isOpen, onClose, onFinish, initialTopic = "", config, appSettings, onShowToast }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [topic, setTopic] = useState(initialTopic);
    const [isRefining, setIsRefining] = useState(false);
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
    
    // Track regeneration loading states per item ID
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

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

    const getProviderName = (task: 'text' | 'image' | 'vision') => {
        if (appSettings.ai.provider === 'CustomCombo' && appSettings.ai.customCombo) {
             return 'Custom Combo';
        }
        return appSettings.ai.provider;
    };

    // --- Actions ---

    const handleRefine = async () => {
        if (!topic.trim()) return;
        setIsRefining(true);
        const providerName = getProviderName('text');
        onShowToast(`调用 ${providerName} API 服务修饰主题中...`, 'loading');
        
        try {
            const refined = await refinePrompt(topic, appSettings);
            setTopic(refined);
            onShowToast(`调用 ${providerName} API 服务成功`, 'success');
        } catch (error) {
            console.error(error);
            onShowToast(`调用 ${providerName} API 服务失败`, 'error');
            alert("AI 修饰失败，请检查配置。");
        } finally {
            setIsRefining(false);
        }
    };

    const handleGenerateOutline = async () => {
        if (!topic.trim()) return;
        setIsGeneratingOutline(true);
        const providerName = getProviderName('text');
        onShowToast(`调用 ${providerName} API 服务生成大纲中，请耐心等待⌛️`, 'loading');

        try {
            const items = await generateOutline(topic, config, appSettings);
            if(items.length > 0) {
                 setOutlineItems(items);
                 setStep(2);
                 onShowToast(`调用 ${providerName} API 服务成功`, 'success');
            } else {
                 onShowToast(`调用 ${providerName} API 服务返回空数据`, 'error');
            }
        } catch (error) {
            console.error(error);
            onShowToast(`调用 ${providerName} API 服务失败`, 'error');
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

    // --- Back Navigation ---
    const handleBackStep = () => {
        if (step > 1) {
            setStep(prev => (prev - 1) as 1 | 2);
        }
    };

    // --- Step 2 Actions (Outline Structure) ---

    const handleRegenerateSingleOutlineItem = async (id: string, index: number) => {
        setLoadingItems(prev => ({ ...prev, [id]: true }));
        try {
             const result = await generateSingleOutlineItem(topic, index, outlineItems.length, appSettings);
             handleUpdateOutlineItem(id, { title: result.title, brief: result.brief });
        } catch (e) {
             onShowToast("单页大纲重写失败", 'error');
        } finally {
             setLoadingItems(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleClearSingleOutlineItem = (id: string) => {
        handleUpdateOutlineItem(id, { title: '', brief: '' });
    };

    const handleClearAllOutlineItems = () => {
        setConfirmState({
            isOpen: true,
            title: "清空大纲内容",
            message: "确定要清空所有卡片的标题和简介吗？(结构保留)",
            onConfirm: () => {
                setOutlineItems(prev => prev.map(item => ({ ...item, title: '', brief: '' })));
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // --- Step 3 Actions (Detail Content) ---

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
            const structuralTypes: PageType[] = ['cover', 'directory', 'transition', 'end'];
            
            if (structuralTypes.includes(item.pageType)) {
                await new Promise(resolve => setTimeout(resolve, 300)); 
                handleUpdateOutlineItem(id, { fullContent: item.brief, status: 'success' });
            } else {
                const detail = await generateSlideDetail(item.title, item.brief, topic, appSettings);
                handleUpdateOutlineItem(id, { fullContent: detail, status: 'success' });
            }
        } catch (e) {
            handleUpdateOutlineItem(id, { status: 'error' });
            throw e;
        }
    };

    const handleClearSingleDetail = (id: string) => {
        handleUpdateOutlineItem(id, { fullContent: '', status: 'idle' });
    };

    const handleClearAllDetails = () => {
        setConfirmState({
            isOpen: true,
            title: "清空详细内容",
            message: "确定要清空所有生成的详细文案吗？",
            onConfirm: () => {
                setOutlineItems(prev => prev.map(item => ({ ...item, fullContent: '', status: 'idle' })));
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleBatchGenerateDetails = async () => {
        setIsGeneratingDetails(true);
        const providerName = getProviderName('text');
        onShowToast(`批量调用 ${providerName} API 生成详细描述中...`, 'loading');

        const pendingItems = outlineItems; 
        
        // Use concurrency from settings, default high if undefined
        const CONCURRENCY = appSettings.performance.textConcurrency || 99;
        const activePromises = new Set<Promise<void>>();
        let failureCount = 0;

        for (const item of pendingItems) {
            if (item.status === 'success' && item.fullContent) continue;
            
            while (activePromises.size >= CONCURRENCY) {
                await Promise.race(activePromises);
            }

            const p = generateDetailForId(item.id).then(() => {
                activePromises.delete(p);
            }).catch(() => {
                failureCount++;
                activePromises.delete(p);
            });
            activePromises.add(p);
        }

        await Promise.all(activePromises);
        setIsGeneratingDetails(false);

        if (failureCount > 0) {
            onShowToast(`调用 ${providerName} API 完成，但有 ${failureCount} 页失败`, 'error');
        } else {
            onShowToast(`调用 ${providerName} API 服务成功`, 'success');
        }
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
                        {/* Back Button */}
                        {step > 1 && (
                             <button 
                                onClick={handleBackStep} 
                                className="mr-3 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                title="返回上一步"
                             >
                                 <ArrowLeft size={20} />
                             </button>
                        )}

                        {/* Stepper UI */}
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
                                    <button onClick={handleClearAllOutlineItems} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-500 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-red-50 transition-all"><Eraser size={14} /> 清空内容</button>
                                    <button onClick={handleGenerateOutline} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-200 shadow-sm transition-all"><RefreshCw size={14} /> 重新生成大纲</button>
                                    <button onClick={proceedToDetails} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-medium">
                                        下一步: 生成详细内容 <ArrowRight size={18} />
                                    </button>
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
                                                {/* Clear Single */}
                                                <button onClick={() => handleClearSingleOutlineItem(item.id)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors" title="清空内容"><Eraser size={16} /></button>
                                                {/* Regenerate Single */}
                                                <button onClick={() => handleRegenerateSingleOutlineItem(item.id, item.index)} disabled={loadingItems[item.id]} className={`p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors ${loadingItems[item.id] ? 'animate-spin' : ''}`} title="重写此页"><RefreshCw size={16} /></button>
                                                {/* Delete */}
                                                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                                <button onClick={() => handleDeleteOutlineItem(item.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" title="删除"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        {/* Content Inputs */}
                                        <div className="space-y-3 mt-2">
                                            <input value={item.title} onChange={(e) => handleUpdateOutlineItem(item.id, { title: e.target.value })} className="w-full font-bold text-lg text-slate-800 border-b border-transparent focus:border-indigo-300 hover:border-slate-200 bg-transparent p-1 focus:outline-none transition-colors" placeholder="页面标题" />
                                            <textarea value={item.brief} onChange={(e) => handleUpdateOutlineItem(item.id, { brief: e.target.value })} className="w-full text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 focus:border-indigo-300 focus:bg-white focus:outline-none resize-none transition-all h-24" placeholder="页面简介内容" />
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
                                <div className="flex gap-2">
                                    <button onClick={handleClearAllDetails} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-500 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-red-50 transition-all"><Eraser size={14} /> 清空内容</button>
                                    <button onClick={handleBatchGenerateDetails} disabled={isGeneratingDetails} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 font-medium">
                                        {isGeneratingDetails ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />} {isGeneratingDetails ? "生成中..." : "批量生成详细描述"}
                                    </button>
                                    <button onClick={handleFinish} className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-lg hover:bg-rose-600 transition-all shadow-md shadow-rose-200 font-medium">
                                        <Check size={18} /> 完成并导入工作台
                                    </button>
                                </div>
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
                                            <div className="flex items-center gap-1">
                                                {item.status === 'generating' && <Loader2 size={16} className="animate-spin text-indigo-500 mr-2" />}
                                                {/* Clear Single */}
                                                <button onClick={() => handleClearSingleDetail(item.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="清空内容"><Eraser size={14} /></button>
                                                {/* Regenerate Single */}
                                                <button onClick={() => generateDetailForId(item.id)} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="重新生成"><RefreshCw size={14} /></button>
                                                {item.status === 'success' && <div className="text-green-500 bg-green-50 rounded-full p-1 ml-1"><Check size={12} /></div>}
                                                {item.status === 'error' && <div className="text-red-500 bg-red-50 rounded-full p-1 cursor-pointer ml-1" onClick={() => generateDetailForId(item.id)} title="点击重试">!</div>}
                                            </div>
                                        </div>
                                        <div className="relative p-4 flex-1 min-h-[240px] flex flex-col">
                                            {/* Status overlay */}
                                            {(!item.fullContent && item.status === 'idle') && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                                                    <button onClick={() => generateDetailForId(item.id)} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all">生成此页内容</button>
                                                </div>
                                            )}
                                            
                                            <textarea 
                                                value={item.fullContent || ''} 
                                                onChange={(e) => handleUpdateOutlineItem(item.id, { fullContent: e.target.value })}
                                                placeholder={item.status === 'generating' ? "AI 正在思考中..." : "等待生成详细内容..."}
                                                className="w-full h-full min-h-[200px] resize-none focus:outline-none bg-transparent text-sm text-slate-600 leading-relaxed custom-scrollbar"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
