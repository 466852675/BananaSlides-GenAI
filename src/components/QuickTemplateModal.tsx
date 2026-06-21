import React, { useState, useRef, useEffect } from 'react';
import { PointsBadge } from './PointsBadge';
import { X, Sparkles, Upload, FileText, Image as ImageIcon, Loader2, ArrowRight, Undo2 } from 'lucide-react';
import { analyzeTemplateConcept, refinePrompt } from '../services/geminiService';
import { getActionCost, getBalance } from '../api/points';
import { AIGlowContainer } from './AIGlowContainer';
import { StyleConfig, AppSettings } from '../types';

interface QuickTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAnalyzeSuccess: (config: StyleConfig) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'loading') => void;
    appSettings: AppSettings;
}

export const QuickTemplateModal: React.FC<QuickTemplateModalProps> = ({
    isOpen,
    onClose,
    onAnalyzeSuccess,
    onShowToast,
    appSettings,
}) => {
    const [inputText, setInputText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingText, setLoadingText] = useState('正在分析...');
    const [isRefining, setIsRefining] = useState(false);
    const [currentPointsInfo, setCurrentPointsInfo] = useState<{ balance: number, cost: number } | null>(null);
    const previousInputTextRef = useRef<string | null>(null);

    // --- Interruption Prevention ---
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isAnalyzing) {
                const msg = "AI 正在分析模版中，关闭页面可能导致积分损失。确定要离开吗？";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isAnalyzing]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setInputText('');
            setSelectedFile(null);
            setIsAnalyzing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getProviderName = (task: 'text' | 'image' | 'vision') => {
        if (appSettings.ai.provider === 'CustomCombo' && appSettings.ai.customCombo) {
            return 'Custom Combo';
        }
        return appSettings.ai.provider;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSmartRefine = async () => {
        if (!inputText.trim()) return;
        const triggerTime = new Date().toISOString();
        // 存旧值供撤回
        previousInputTextRef.current = inputText;
        setIsRefining(true);
        const providerName = getProviderName('text');

        try {
            try {
                const [cost, balance] = await Promise.all([
                    getActionCost('smart_refine', true),
                    getBalance()
                ]);
                onShowToast(`AI 正在润色描述词。本次预计扣除 ${cost} 积分，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`, 'loading');
            } catch (e) {
                console.warn('Failed to fetch real-time points info', e);
                onShowToast('正在调用 AI 服务润色描述词...', 'loading');
            }
            const refined = await refinePrompt(inputText, triggerTime);
            setInputText(refined);
            onShowToast(`调用 ${providerName} API 服务成功`, 'success');
        } catch (error: any) {
            console.error("Refine failed", error);
            onShowToast(`调用 ${providerName} API 服务失败: ${error.message || ''}`, 'error');
        } finally {
            setIsRefining(false);
        }
    };

    const handleSubmit = async () => {
        if (!inputText.trim() && !selectedFile) return;
        const triggerTime = new Date().toISOString();

        setIsAnalyzing(true);
        const providerName = getProviderName('vision'); // Assuming mostly vision/text hybrid
        const actionText = selectedFile ? (selectedFile.type.startsWith('image/') ? '分析视觉风格' : '阅读文档') : '分析设计需求';

        // Determine action code for cost fetching
        const actionCode = selectedFile ? (selectedFile.type.startsWith('image/') ? 'vision_analyze' : 'doc_parse') : 'vision_analyze';

        try {
            const [cost, balance] = await Promise.all([
                getActionCost(actionCode as any, true),
                getBalance()
            ]);
            setCurrentPointsInfo({ balance: balance.points, cost });
            const loadingMsg = `AI 正在${actionText}中。本次预计扣除 ${cost} 积分，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`;
            setLoadingText(loadingMsg);
            onShowToast(loadingMsg, 'loading');
        } catch (e) {
            const fallbackMsg = `正在调用 ${providerName} API ${actionText}...`;
            setLoadingText(fallbackMsg);
            onShowToast(fallbackMsg, 'loading');
        }

        try {
            let input: string | File = inputText;
            if (selectedFile) {
                input = selectedFile;
            }

            const config = await analyzeTemplateConcept(input, triggerTime);
            onAnalyzeSuccess(config);
            onShowToast(`调用 ${providerName} API 服务成功`, 'success');
            onClose();

        } catch (error) {
            console.error("Analysis failed", error);
            setLoadingText("分析失败，请重试");
            onShowToast(`调用 ${providerName} API 服务失败`, 'error');
            setTimeout(() => setIsAnalyzing(false), 2000);
        }
    };

    const isImage = selectedFile?.type?.startsWith('image/');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-violet-600" />
                            AI 智能模版生成
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            描述你的需求，或上传参考图/文档，AI 将自动为你生成设计规范
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* File Upload Area */}
                    <AIGlowContainer
                        isActive={isAnalyzing && !!selectedFile}
                        className="relative"
                        colorFrom="#8b5cf6"
                        colorTo="#06b6d4"
                    >
                        <div
                            className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer group
                  ${(isAnalyzing && !!selectedFile) ? 'border-transparent bg-white' : (selectedFile ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50')}
                `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,application/pdf,.md,.txt,.docx"
                                onChange={handleFileChange}
                            />

                            <div className="flex flex-col items-center justify-center text-center gap-3">
                                {selectedFile ? (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                                            {isImage ? <ImageIcon className="w-6 h-6 text-violet-600" /> : <FileText className="w-6 h-6 text-violet-600" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-violet-700 text-lg">{selectedFile.name}</p>
                                            <p className="text-sm text-violet-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • 点击更换</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-violet-100 transition-colors flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-violet-600 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">点击上传参考文件</p>
                                            <p className="text-sm text-slate-400 mt-1">支持 PPT截图 / 设计稿 / PDF / 文档</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </AIGlowContainer>

                    <div className="mb-2 px-1 flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700">或者直接描述你的需求</label>
                        <button
                            onClick={handleSmartRefine}
                            disabled={!inputText.trim() || isRefining}
                            className="flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-700 disabled:opacity-50 transition-colors relative z-30"
                        >
                            <Sparkles className="w-3 h-3" />
                            {isRefining ? '优化中...' : 'AI 润色描述'}
                            <PointsBadge actionCode="smart_refine" compact />
                        </button>
                        {previousInputTextRef.current !== null && !isRefining && (
                            <button
                                onClick={() => { setInputText(previousInputTextRef.current!); previousInputTextRef.current = null; }}
                                className="flex items-center gap-1 text-xs text-slate-500 font-medium hover:text-slate-700 transition-colors relative z-30"
                                title="撤回修饰"
                            >
                                <Undo2 className="w-3 h-3" />
                                撤回
                            </button>
                        )}
                    </div>

                    <AIGlowContainer
                        isActive={isRefining || (isAnalyzing && !!inputText)}
                        className="relative"
                        colorFrom="#8b5cf6"
                        colorTo="#06b6d4"
                    >
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="例如：帮我设计一套极简科技风的模版，主色调要用深蓝和青色，适合做云服务产品的介绍，整体要有通透的毛玻璃质感..."
                            className={`w-full h-32 px-4 py-3 rounded-xl border focus:ring-4 focus:ring-violet-100 transition-all outline-none resize-none text-slate-700 placeholder:text-slate-400 ${(isRefining || (isAnalyzing && !!inputText))
                                ? 'bg-white border-transparent'
                                : 'bg-white border-slate-200 focus:border-violet-500'
                                }`}
                        />
                    </AIGlowContainer>

                    {/* Action Area */}
                    <button
                        onClick={handleSubmit}
                        disabled={isAnalyzing || (!inputText.trim() && !selectedFile)}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl shadow-violet-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                        ${(isAnalyzing || (!inputText.trim() && !selectedFile))
                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-violet-300 hover:from-violet-500 hover:to-indigo-500'}
                        `}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                正在分析建议中...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                开始生成模版规范 (Start Analysis)
                                <PointsBadge actionCode="vision_analyze" compact showIcon={false} className="text-white/80 bg-white/20 px-1.5 rounded-full" />
                                <ArrowRight className="w-5 h-5 opacity-50" />
                            </>
                        )}
                    </button>

                </div>
            </div>
        </div>
    );
};
