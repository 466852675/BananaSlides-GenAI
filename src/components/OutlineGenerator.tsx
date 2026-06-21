
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PointsBadge } from './PointsBadge';
import { Sparkles, X, RefreshCw, Trash2, Wand2, ArrowRight, Loader2, Play, Check, FileText, ArrowLeft, Eraser, Eye, Edit3, Upload, Download, Undo2 } from 'lucide-react';
import { refinePrompt, smartRefine, generateOutline, generateSlideDetail, generateSingleOutlineItem, smartRefineAuto, generateOutlineAuto, generateSlideDetailAuto } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { extractTextFromUpload } from '../utils/fileParser';
import { OutlineItem, GeneratedSlide, StyleConfig, PageType, AppSettings } from '../types';

import { ConfirmDialog } from './ConfirmDialog';
import { AIGlowContainer } from './AIGlowContainer';
import { ToastMessage } from './Toast';
import { getPointsRule, getBalance } from '../api/points';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface OutlineGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onFinish: (slides: GeneratedSlide[]) => void;
    initialTopic?: string;
    config: StyleConfig;
    appSettings: AppSettings;
    onShowToast: (msg: string, type: ToastMessage['type']) => void;
    projectId?: string;
}

const getOutlineDraftKey = (userId?: string) => `bananaslides_outline_draft_v1_${userId || 'guest'}`;

interface OutlineDraft {
    topic: string;
    step: 1 | 2 | 3;
    outlineItems: OutlineItem[];
    lastUpdated: number;
    attachedFile?: { name: string; type: string; content?: string } | null;
}

const getPageTypeLabel = (type: PageType) => {
    switch (type) {
        case 'cover': return '封面';
        case 'directory': return '目录';
        case 'end': return '结束';
        case 'transition': return '过渡';
        default: return '内容';
    }
}

/**
 * 专门用于渲染解析后内容的预览器
 * 混合渲染器：支持标准 Markdown 与 HTML 表格（如 MinerU 输出的格式）
 */
const ContentPreview: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
    // 渲染混合内容的函数
    const renderMixedContent = (text: string) => {
        if (!text) return null;

        // 正则表达式：匹配 HTML 表格块
        const tableRegex = /(<table[\s\S]*?<\/table>)/gi;
        const parts = text.split(tableRegex);

        return parts.map((part, index) => {
            if (part.match(tableRegex)) {
                // 如果是表格，使用 dangerouslySetInnerHTML 渲染，并包装一层以支持横向滚动
                return (
                    <div
                        key={index}
                        className="my-6 overflow-x-auto shadow-sm rounded-lg border border-slate-200 bg-white"
                        dangerouslySetInnerHTML={{ __html: part }}
                    />
                );
            } else if (part.trim()) {
                // 如果是非表格内容，使用 ReactMarkdown 渲染
                return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
            }
            return null;
        });
    };

    return (
        <div
            className={`w-full h-full p-6 overflow-y-auto bg-slate-50 rounded-xl text-slate-700 leading-relaxed break-words scrollbar-thin scrollbar-thumb-slate-200 ${className}`}
        >
            <style>
                {`
                    .bs-preview-content table { border-collapse: collapse; width: 100%; font-size: 0.875rem; border: none; }
                    .bs-preview-content th, .bs-preview-content td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; vertical-align: middle; }
                    .bs-preview-content th { background-color: #f8fafc; font-weight: 600; color: #334155; }
                    .bs-preview-content h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #1e293b; }
                    .bs-preview-content h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #334155; }
                    .bs-preview-content p { margin-bottom: 0.75rem; }
                    .bs-preview-content ul, .bs-preview-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
                    .bs-preview-content li { margin-bottom: 0.4rem; list-style-type: disc; }
                    .bs-preview-content tr:nth-child(even) { background-color: #f8fafc; }
                    .bs-preview-content td[colspan], .bs-preview-content th[colspan] { text-align: left; }
                `}
            </style>
            <div className="bs-preview-content max-w-4xl mx-auto">
                {renderMixedContent(content)}
            </div>
        </div>
    );
}

export const OutlineGenerator: React.FC<OutlineGeneratorProps> = ({ isOpen, onClose, onFinish, initialTopic = "", config, appSettings, onShowToast, projectId }) => {
    const { user, refreshUser, isLoading: isAuthLoading } = useAuth();
    const draftKey = useMemo(() => getOutlineDraftKey(user?.id), [user?.id]);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    // Tab 1 input state
    const [topic, setTopic] = useState(initialTopic);
    // Tab 2 input state (Isolated)
    const [fileParsedContent, setFileParsedContent] = useState("");
    const [isPreviewing, setIsPreviewing] = useState(false);

    const [isRefining, setIsRefining] = useState(false);
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
    const [deletedItemsPool, setDeletedItemsPool] = useState<OutlineItem[]>([]); // 追踪被删除的项以便原位找回 content

    const [previewItems, setPreviewItems] = useState<Record<string, boolean>>({}); // Step 3 per-item preview toggle

    // 撤回锚点（AI修饰前的内容）
    const previousTopicRef = useRef<string | null>(null);
    const previousFileContentRef = useRef<string | null>(null);

    // Step 1 Tabs & File Upload State
    const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; content?: string } | null>(null);
    const [isPreviewFileOpen, setIsPreviewFileOpen] = useState(false);

    // Track regeneration loading states per item ID
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

    // Points stats for warnings
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);
    const [currentCost, setCurrentCost] = useState<number | null>(null);

    // --- Interruption Prevention ---
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isGeneratingOutline || isGeneratingDetails) {
                const msg = "AI 正在生成中，关闭页面可能导致积分损失。确定要离开吗？";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isGeneratingOutline, isGeneratingDetails]);

    useEffect(() => {
        if (initialTopic) {
            setTopic(initialTopic);
            setStep(1); // Reset to step 1 when new content is loaded
        }
    }, [initialTopic]);

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'info' | 'danger';
        confirmText?: string;
        cancelText?: string;
        onCancel?: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'info' });

    // --- Auto-Save Logic ---
    useEffect(() => {
        if (!isOpen) return;
        // 安全锁定：Auth 加载期间不保存草稿，防止跨账号数据污染
        if (isAuthLoading) return;

        // Fix: logic to include fileParsedContent in validity check
        const hasContent = topic.trim() || (attachedFile && fileParsedContent?.trim());

        // Don't save if practically empty (Step 1 with no content in either tab)
        if (step === 1 && !hasContent) return;

        const timer = setTimeout(() => {
            const draft: OutlineDraft = {
                topic: activeTab === 'text' ? topic : '',
                step,
                outlineItems,
                lastUpdated: Date.now(),
                attachedFile: attachedFile ? { ...attachedFile, content: fileParsedContent } : null,
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
        }, 1000);

        return () => clearTimeout(timer);
    }, [topic, step, outlineItems, attachedFile, fileParsedContent, isOpen, draftKey, isAuthLoading]);

    // --- Restore Logic ---
    useEffect(() => {
        // 安全锁定：Auth 加载期间不读取草稿，防止读取错误用户的数据
        if (isAuthLoading) return;
        if (isOpen) {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                try {
                    const draft = JSON.parse(saved) as OutlineDraft;
                    const hasDraftContent = (draft.topic && draft.topic.trim()) || (draft.attachedFile && draft.attachedFile.content) || draft.outlineItems.length > 0;

                    if (hasDraftContent) {
                        // Avoid conflict with initialTopic if it's the same
                        if (initialTopic && initialTopic === draft.topic && draft.step === 1) return;

                        setConfirmState({
                            isOpen: true,
                            title: '发现未保存的草稿',
                            message: `上次编辑于 ${new Date(draft.lastUpdated).toLocaleString()}。是否恢复未保存的内容？`,
                            confirmText: '恢复编辑',
                            cancelText: '清空草稿',
                            onConfirm: () => {
                                setTopic(draft.topic || "");
                                setStep(draft.step || 1);
                                setOutlineItems(draft.outlineItems || []);
                                if (draft.attachedFile) {
                                    setAttachedFile(draft.attachedFile);
                                    if (draft.attachedFile.content) setFileParsedContent(draft.attachedFile.content);
                                    setActiveTab('file');
                                } else {
                                    setActiveTab('text');
                                }
                                setConfirmState(prev => ({ ...prev, isOpen: false }));
                                onShowToast('已恢复上次的编辑内容', 'success');
                            },
                            onCancel: () => {
                                localStorage.removeItem(draftKey);
                                setConfirmState(prev => ({ ...prev, isOpen: false }));
                                onShowToast('草稿已清空', 'info');
                            }
                        });
                    }
                } catch (e) {
                    localStorage.removeItem(draftKey);
                }
            }
        }
    }, [isOpen, draftKey, isAuthLoading]);

    if (!isOpen) return null;

    const getProviderName = (task: 'text' | 'image' | 'vision') => {
        if (appSettings.ai.provider === 'CustomCombo' && appSettings.ai.customCombo) {
            return 'Custom Combo';
        }
        return appSettings.ai.provider;
    };

    // --- Actions ---

    // File Upload Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await processFile(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    const processFile = async (file: File) => {
        if (isReadingFile) return;

        // Check limit
        /* 
           NOTE: Originally App.tsx checked items.length vs config.targetPageCount.
           Here, generating an outline resets the process (Step 1), so existing items 
           in the background (App's items) might be relevant if we are appending.
           However, OutlineGenerator generates a FRESH outline (Step 2).
           We will enforce logic at the END (onFinish). 
           So for now, we just parse.
        */
        setIsReadingFile(true);
        try {
            const { text, isFallback } = await extractTextFromUpload(file, appSettings, (msg, type) => {
                // Map 'loading' to standard toast type, or handle custom
                const toastType = type === 'loading' ? 'loading' : type === 'error' ? 'error' : 'success';
                onShowToast(msg, toastType);
            });

            if (text) {
                if (isFallback) {
                    onShowToast('MinerU 解析失败，已切换至视觉模型', 'info');
                }

                // CRITICAL FIX: Only update Tab 2's content
                setFileParsedContent(text);

                setAttachedFile({
                    name: file.name,
                    type: file.type || 'TXT',
                    content: text
                });

                // Do NOT switch tab or update 'topic' (Tab 1)
                onShowToast("文件解析成功，您可以切换到文件预览查看内容", "success");
            }
        } catch (error: any) {
            const msg = error instanceof Error ? error.message : "解析失败";
            onShowToast(msg, "error");
        } finally {
            setIsReadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Download attachment
    const handleDownloadAttachment = () => {
        if (!attachedFile || !attachedFile.content) return;
        const blob = new Blob([attachedFile.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `parsed_${attachedFile.name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefine = async () => {
        const contentToRefine = activeTab === 'file' ? fileParsedContent : topic;
        if (!contentToRefine.trim()) return;

        // 存旧值供撤回
        if (activeTab === 'file') {
            previousFileContentRef.current = fileParsedContent;
        } else {
            previousTopicRef.current = topic;
        }

        setIsRefining(true);
        const providerName = getProviderName('text');

        try {
            const [rule, balance] = await Promise.all([
                getPointsRule('smart_refine', true), // Smart Refine uses smart_refine rule
                getBalance()
            ]);
            const cost = rule?.costPoints ?? 1;
            const logicTip = rule?.deductionLogic ? `(${rule.deductionLogic})` : '';
            onShowToast(`AI 正在润色内容。本次预计扣除 ${cost} 积分 ${logicTip}，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`, 'loading');
        } catch (e) {
            console.warn('Failed to fetch real-time points info', e);
            onShowToast(`调用 ${providerName} API 服务修饰内容中...`, 'loading');
        }

        try {
            // 流式输出：实时更新内容
            let accumulatedText = '';
            const refined = await smartRefineAuto(
                contentToRefine,
                activeTab === 'file' ? 'content' : 'requirement_polish',  // 主题输入使用更快的类型
                (chunk) => {
                    // 流式模式：实时更新
                    accumulatedText += chunk;
                    if (activeTab === 'file') {
                        setFileParsedContent(accumulatedText);
                    } else {
                        setTopic(accumulatedText);
                    }
                },
                undefined,
                projectId
            );

            // 非流式模式：直接使用返回值（如果流式没有累积内容）
            if (refined && !accumulatedText) {
                if (activeTab === 'file') {
                    setFileParsedContent(refined);
                } else {
                    setTopic(refined);
                }
            }

            onShowToast(`调用 ${providerName} API 服务成功`, 'success');
            // 成功后刷新用户信息（积分余额）
            setTimeout(() => refreshUser(), 500);
        } catch (error) {
            console.error(error);
            onShowToast(`调用 ${providerName} API 服务失败`, 'error');
            alert("AI 修饰失败，请检查配置。");
        } finally {
            setIsRefining(false);
        }
    };

    const handleClearFileAndContent = () => {
        setConfirmState({
            isOpen: true,
            title: '确认清空内容？',
            message: '移除此附件及其解析内容，清空后将无法恢复，是否继续？',
            onConfirm: () => {
                setAttachedFile(null);
                setFileParsedContent('');
                previousFileContentRef.current = null;   // 同步清空撤回锚点
                if (activeTab === 'file') {
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                onShowToast('内容已清空', 'success');
            },
            type: 'danger'
        });
    };

    const handleGenerateOutline = async () => {
        // Determine source based on active tab
        const sourceContent = activeTab === 'file' ? fileParsedContent : topic;

        if (!sourceContent.trim()) {
            onShowToast('请输入主题或解析文件', 'error');
            return;
        }

        setIsGeneratingOutline(true);
        setOutlineItems([]);  // 清空旧大纲
        setStep(2);  // 立即跳转到第二步，让用户看到大纲逐一生成

        const providerName = getProviderName('text');

        // Action name for unified wording
        const actionName = outlineItems.length > 0 ? '重新生成大纲' : '生成大纲';
        let costInfoMsg = `AI 正在${actionName}。正在调用 ${providerName} API 服务...`;

        try {
            const [rule, balance] = await Promise.all([
                getPointsRule('outline_generation', true),
                getBalance()
            ]);
            const cost = rule?.costPoints ?? 5;
            setCurrentCost(cost);
            setCurrentBalance(balance.points);
            const logicTip = rule?.deductionLogic ? `(${rule.deductionLogic})` : '';
            costInfoMsg = `AI 正在${actionName}。本次预计扣除 ${cost} 积分 ${logicTip}，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`;
        } catch (e) {
            console.warn('Failed to fetch real-time points info', e);
        }

        onShowToast(costInfoMsg, 'loading');

        try {
            // 流式输出：逐项显示大纲
            const items = await generateOutlineAuto(
                sourceContent,
                config,
                (item, index) => {
                    // 流式模式：逐项添加到列表
                    setOutlineItems(prev => {
                        // 避免重复添加相同索引的项目
                        if (prev.some(i => i.index === item.index)) {
                            return prev;
                        }
                        return [...prev, item];
                    });
                },
                undefined,
                projectId
            );

            // 检查是否有项目生成
            if (items && items.length > 0) {
                setDeletedItemsPool([]); // 重新生成大纲时，清空旧任务的回收站
                onShowToast(`大纲生成成功`, 'success');
                // 成功后刷新用户信息（积分余额）
                setTimeout(() => refreshUser(), 500);
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
        if (!confirm('确定要删除此大纲项吗？')) return;
        const itemToDelete = outlineItems.find(i => i.id === id);
        if (itemToDelete) {
            setDeletedItemsPool(prev => [...prev.filter(i => i.index !== itemToDelete.index), itemToDelete]);
        }
        setOutlineItems(prev => prev.filter(item => item.id !== id));
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
            const [rule, balance] = await Promise.all([
                getPointsRule('outline_page_regen', true),
                getBalance()
            ]);
            const cost = rule?.costPoints ?? 1;
            const logicTip = rule?.deductionLogic ? `(${rule.deductionLogic})` : '';
            onShowToast(`AI 正在重写此页。本次预计扣除 ${cost} 积分 ${logicTip}，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`, 'loading');
        } catch (e) {
            console.warn('Failed to fetch real-time points info', e);
            onShowToast("正在通过 AI 重写此页...", 'loading');
        }

        try {
            const result = await generateSingleOutlineItem(topic, index, outlineItems.length, undefined, projectId);
            handleUpdateOutlineItem(id, { title: result.title, brief: result.brief });
            onShowToast("单页大纲重写成功", 'success');
            setTimeout(() => refreshUser(), 500);
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
                // Also clear draft effectively (by auto-save overwriting or explicit removal?)
                // Auto-save will overwrite with empty items shortly.
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // --- Step 3 Actions (Detail Content) ---
    const enforceStructure = () => {
        const targetCount = config.targetPageCount;
        const targetTypes = config.pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 };

        // 1. 构建期望的类型序列 (与后端 Prompt 逻辑完全一致)
        const targetSequence: PageType[] = [];
        for (let i = 0; i < (targetTypes.cover || 0); i++) targetSequence.push('cover');
        for (let i = 0; i < (targetTypes.directory || 0); i++) targetSequence.push('directory');

        const transitions = targetTypes.transition || 0;
        const contents = targetTypes.content || 0;
        if (transitions === 0) {
            for (let i = 0; i < contents; i++) targetSequence.push('content');
        } else {
            const groupSize = Math.floor(contents / transitions);
            const remainder = contents % transitions;
            for (let i = 0; i < transitions; i++) {
                targetSequence.push('transition');
                const count = groupSize + (i < remainder ? 1 : 0);
                for (let j = 0; j < count; j++) { targetSequence.push('content'); }
            }
        }
        for (let i = 0; i < (targetTypes.end || 0); i++) targetSequence.push('end');

        // 2. 映射现有内容 (槽位优先 + 类型贪婪匹配)
        const newItems: OutlineItem[] = [];
        const usedIds = new Set<string>();
        const pool = [...outlineItems];

        targetSequence.forEach((type, idx) => {
            const slot = idx + 1;
            // 优先级 1: 在当前活跃大纲中寻找匹配项 (精准原位复位)
            let match = pool.find(item => item.index === slot && item.pageType === type && !usedIds.has(item.id));

            // 优先级 2: 从已删除池中寻找匹配项 (记忆寻回 - 优先恢复原标题)
            if (!match) {
                match = deletedItemsPool.find(item => item.index === slot && item.pageType === type);
            }

            // 优先级 3: 仅类型匹配 (位置已变，但内容还在)
            if (!match) {
                match = pool.find(item => item.pageType === type && !usedIds.has(item.id));
            }

            if (match) {
                usedIds.add(match.id);
                newItems.push({ ...match, index: slot });
            } else {
                // 优先级 4: 兜底智能标题占位
                const displayType = getPageTypeLabel(type);
                newItems.push({
                    id: Math.random().toString(36).substr(2, 9),
                    index: slot,
                    pageType: type,
                    title: `关于“${topic}”的${displayType}方案`,
                    brief: `【智能补齐】因检测到原第 ${slot} 页结构缺失且无历史记忆，系统已自动按全局配比补回。AI 将在生成详情时补完文案。`,
                    status: 'idle'
                });
            }
        });

        setOutlineItems(newItems);
        return newItems;
    };

    const proceedToDetails = () => {
        // 1. 结构一致性校验
        const currentCount = outlineItems.length;
        const targetCount = config.targetPageCount;

        const currentTypes = {
            cover: outlineItems.filter(i => i.pageType === 'cover').length,
            directory: outlineItems.filter(i => i.pageType === 'directory').length,
            transition: outlineItems.filter(i => i.pageType === 'transition').length,
            content: outlineItems.filter(i => i.pageType === 'content').length,
            end: outlineItems.filter(i => i.pageType === 'end').length,
        };

        const targetTypes = config.pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 };

        const isMismatch = currentCount !== targetCount ||
            currentTypes.cover !== (targetTypes.cover || 0) ||
            currentTypes.directory !== (targetTypes.directory || 0) ||
            currentTypes.transition !== (targetTypes.transition || 0) ||
            currentTypes.end !== (targetTypes.end || 0);

        if (isMismatch) {
            setConfirmState({
                isOpen: true,
                title: "大纲结构与全局设置不一致",
                message: `当前大纲页数为 ${currentCount} 页，而全局设置为 ${targetCount} 页。点击确认后系统将自动“强制对齐”数据（补齐缺失页或裁剪多余页）并继续生成详细内容。`,
                onConfirm: () => {
                    enforceStructure();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    setStep(3);
                }
            });
            return;
        }

        setConfirmState({
            isOpen: true,
            title: "生成详细描述内容",
            message: "确定要基于当前大纲生成每个页面的详细描述内容吗？",
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
                setStep(3);
            }
        });
    };

    const generateDetailForId = async (id: string) => {
        const item = outlineItems.find(i => i.id === id);
        if (!item) return;

        const index = outlineItems.indexOf(item) + 1;
        const total = outlineItems.length;

        handleUpdateOutlineItem(id, { status: 'generating' });
        try {
            const structuralTypes: PageType[] = ['cover', 'directory', 'transition', 'end'];

            if (!structuralTypes.includes(item.pageType)) {
                try {
                    const [rule, balance] = await Promise.all([
                        getPointsRule('slide_content', true),
                        getBalance()
                    ]);
                    const cost = rule?.costPoints ?? 1;
                    const logicTip = rule?.deductionLogic ? `(${rule.deductionLogic})` : '';
                    onShowToast(`AI 正在生成此页正文。本次预计扣除 ${cost} 积分 ${logicTip}，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`, 'loading');
                } catch (e) {
                    console.warn('Failed to fetch real-time points info', e);
                    onShowToast(`AI 正在生成此页正文...`, 'loading');
                }
            }

            if (structuralTypes.includes(item.pageType)) {
                await new Promise(resolve => setTimeout(resolve, 300));
                handleUpdateOutlineItem(id, { fullContent: item.brief, status: 'success' });
            } else {
                // 流式输出：实时更新详情内容
                let accumulatedDetail = '';

                // 【关键修复】确保传入的上下文包含完整的文档原内容
                // 当用户在上传文档模式下，fileParsedContent 包含文档全文，
                // 必须将其作为 topicContext 传入以约束 AI 严格基于原文生成
                const context = (activeTab === 'file' && attachedFile && fileParsedContent?.trim())
                    ? fileParsedContent
                    : topic;

                const detail = await generateSlideDetailAuto(
                    item.title,
                    item.brief,
                    context,
                    index,
                    total,
                    item.pageType,
                    (chunk) => {
                        // 流式模式：实时更新
                        accumulatedDetail += chunk;
                        handleUpdateOutlineItem(id, { fullContent: accumulatedDetail });
                    },
                    undefined,
                    projectId
                );

                // 非流式模式：直接使用返回值
                if (detail && !accumulatedDetail) {
                    handleUpdateOutlineItem(id, { fullContent: detail, status: 'success' });
                } else {
                    handleUpdateOutlineItem(id, { status: 'success' });
                }
            }
            onShowToast("此页内容生成成功", 'success');
        } catch (e: any) {
            handleUpdateOutlineItem(id, { status: 'error' });
            const errorMsg = e instanceof Error ? e.message : "生成内容失败";
            onShowToast(errorMsg, 'error');
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

    const executeBatchGeneration = async (force: boolean = false) => {
        setIsGeneratingDetails(true);
        const providerName = getProviderName('text');
        onShowToast(`批量调用 ${providerName} API 生成详细描述中...`, 'loading');

        // Use concurrency from settings, default to 1 for API rate limit safety
        const CONCURRENCY = appSettings.performance.textConcurrency || 1;
        const pendingItems = [...outlineItems];
        console.log(`[Batch Generation] Starting with concurrency ${CONCURRENCY} for ${pendingItems.length} items`);

        let failureCount = 0;
        let successCount = 0;

        // 创建任务副本队列
        const queue = [...pendingItems];

        // 创建并发执行器销
        const workers = Array.from({ length: CONCURRENCY }).map(async (_, workerIndex) => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (!item) break;

                // 如果非强制且已成功，跳过
                if (!force && item.status === 'success' && item.fullContent) {
                    console.log(`[Worker ${workerIndex}] Skipping already successful item: ${item.id}`);
                    continue;
                }

                try {
                    await generateDetailForId(item.id);
                    successCount++;
                } catch (err) {
                    console.error(`[Worker ${workerIndex}] Failed item ${item.id}:`, err);
                    failureCount++;
                }
            }
        });

        await Promise.all(workers);
        console.log(`[Batch Generation] Finished. Success: ${successCount}, Failures: ${failureCount}`);

        setIsGeneratingDetails(false);

        if (failureCount > 0) {
            onShowToast(`批量生成已完成，但有 ${failureCount} 页遇到问题`, 'error');
        } else if (successCount === 0 && !force) {
            onShowToast(`没有需要生成的页面`, 'info');
        } else {
            onShowToast(`所有页面内容已生成完毕`, 'success');
        }
    };

    const handleBatchGenerateDetails = async () => {
        const hasPending = outlineItems.some(i => i.status !== 'success' || !i.fullContent);

        if (hasPending) {
            setIsGeneratingDetails(true);
            try {
                const [rule, balance] = await Promise.all([
                    getPointsRule('full_content_generation', true),
                    getBalance()
                ]);
                const totalCost = rule?.costPoints ?? 10;
                setCurrentCost(totalCost);
                setCurrentBalance(balance.points);
                const logicTip = rule?.deductionLogic ? `(${rule.deductionLogic})` : '';
                onShowToast(`AI 正在批量生成详细内容。本次预计扣除 ${totalCost} 积分 ${logicTip}，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`, 'loading');
            } catch (e) {
                console.warn('Failed to fetch real-time points info', e);
                onShowToast('AI 正在批量生成内容详情...', 'loading');
            }
            await executeBatchGeneration(false);
        } else {
            // All done mode: ask for confirmation to regenerate all
            setConfirmState({
                isOpen: true,
                title: "重新生成所有详细内容",
                message: "检测到所有页面均已拥有详细内容。是否确定要覆盖现有内容，根据当前大纲全部重新生成？",
                onConfirm: async () => {
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    setIsGeneratingDetails(true);
                    // Fetch fresh balance and cost for warning (using slide_content rule)
                    try {
                        const [rule, balance] = await Promise.all([
                            getPointsRule('full_content_generation', true),
                            getBalance()
                        ]);
                        const totalCost = rule?.costPoints ?? 10;
                        setCurrentCost(totalCost);
                        setCurrentBalance(balance.points);
                        const logicTip = rule?.deductionLogic ? `(${rule.deductionLogic})` : '';
                        onShowToast(`AI 正在重新生成所有详细内容。本次预计扣除 ${totalCost} 积分 ${logicTip}，剩余 ${balance.points} 积分，请勿关闭或刷新页面。`, 'loading');
                    } catch (e) {
                        console.warn('Failed to fetch real-time points info', e);
                        onShowToast('AI 正在重新生成所有详细内容... 正在调用服务，请稍候。', 'loading');
                    }
                    executeBatchGeneration(true);
                }
            });
        }
    };

    const handleFinish = () => {
        setConfirmState({
            isOpen: true,
            title: "生成 PPT",
            message: `确定要将这 ${outlineItems.length} 页内容导入工作台吗？\n(当前全局设定总页数为 ${config.targetPageCount} 页)`,
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, isOpen: false }));

                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const presenterName = user?.username || user?.nickname || user?.email || '';

                const slides: GeneratedSlide[] = outlineItems.map(item => {
                    let textContent = item.fullContent || item.brief;

                    // 【封面页增强】自动附加分析日期和讲解人信息
                    if (item.pageType === 'cover') {
                        const extra = [`分析日期：${dateStr}`];
                        if (presenterName) {
                            extra.unshift(`主讲人：${presenterName}`);
                        }
                        textContent = textContent + '\n\n' + extra.join('  |  ');
                    }

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        contentType: 'text',
                        originalFile: null,
                        pageType: item.pageType,
                        title: item.title,
                        textContent,
                        previewUrl: '',
                        variants: [],
                        variantCount: config.defaultVariantCount || 1,
                        status: 'idle',
                        createdAt: Date.now()
                    };
                });

                // Clear draft on success
                localStorage.removeItem(draftKey);
                setCurrentCost(null);

                onFinish(slides);
                onClose();
            }
        });
    };

    // Construct the description string
    const structureDesc = [
        `${config.pageStructure?.cover || 0}封面`,
        `${config.pageStructure?.directory || 0}目录`,
        (config.pageStructure?.transition || 0) > 0 ? `${config.pageStructure?.transition}过渡` : null,
        `${config.pageStructure?.content || 0}内容`,
        `${config.pageStructure?.end || 0}结束`
    ].filter(Boolean).join('+');

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={() => {
                    if (confirmState.onCancel) {
                        confirmState.onCancel();
                    } else {
                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                    }
                }}
                type={confirmState.type || 'info'}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
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

                {/* Persistent Attachment Bar */}
                {attachedFile && (
                    <div className="px-8 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 slide-in-from-bottom-2 fade-in animate-in">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FileText size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">{attachedFile.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{attachedFile.type || 'UNKNOWN'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPreviewFileOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <Eye size={12} /> 预览
                            </button>
                            <button
                                onClick={handleDownloadAttachment}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <Download size={12} /> 下载
                            </button>
                            <button
                                onClick={handleClearFileAndContent}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50"
                                title="移除附件"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* File Preview Modal */}
                {isPreviewFileOpen && attachedFile && attachedFile.content && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm" onClick={() => setIsPreviewFileOpen(false)}>
                        <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-500" />
                                    {attachedFile.name}
                                </h3>
                                <button onClick={() => setIsPreviewFileOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-auto p-6 bg-slate-50">
                                <div className="prose prose-slate prose-sm max-w-none p-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{attachedFile.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                    {/* Step 1 ... (Same as before) */}
                    {/* Step 1 ... */}
                    {step === 1 && (
                        <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Step 1 Content Container with Tabs */}
                            <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 relative group focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all min-h-[500px] flex flex-col">

                                {/* Header with Tabs (Centered) */}
                                <div className="flex items-center justify-center mb-5 relative">
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setActiveTab('text')}
                                            className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'text'
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Sparkles size={14} /> 一句话生成
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('file')}
                                            className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'file'
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Upload size={14} /> 解析文件
                                        </button>
                                    </div>

                                </div>


                                {/* TAB 1: TEXT INPUT */}
                                {activeTab === 'text' && (
                                    <div className="flex-1 flex flex-col min-h-0 gap-4">
                                        <AIGlowContainer
                                            isActive={isRefining || isGeneratingOutline}
                                            className="flex-1 min-h-0 rounded-xl"
                                            colorFrom="#4f46e5"
                                            colorTo="#8b5cf6"
                                        >
                                            <textarea
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                                placeholder="请输入 PPT 主题，例如：'关于2026年人工智能发展趋势的商业路演'..."
                                                className={`w-full h-full p-4 text-base resize-none outline-none text-slate-700 placeholder:text-slate-300 rounded-xl transition-colors ${(isRefining || isGeneratingOutline)
                                                    ? 'bg-slate-50 border-transparent'
                                                    : 'bg-slate-50 border border-slate-100 focus:bg-white'
                                                    }`}
                                            />
                                        </AIGlowContainer>

                                        <div className="flex justify-between items-center shrink-0">
                                            <span className="text-xs text-slate-400">系统将按照全局设置的 {config.targetPageCount} 页结构生成</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setTopic(''); previousTopicRef.current = null; }}
                                                    className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                >
                                                    清空
                                                </button>
                                                {previousTopicRef.current !== null && !isRefining && (
                                                    <button
                                                        onClick={() => { setTopic(previousTopicRef.current!); previousTopicRef.current = null; }}
                                                        className="text-xs flex items-center gap-1 bg-white text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 hover:shadow-sm transition-all font-medium"
                                                        title="撤回修饰"
                                                    >
                                                        <Undo2 size={12} />
                                                        撤回修饰
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleRefine}
                                                    disabled={isRefining || !topic.trim()}
                                                    className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 font-medium"
                                                >
                                                    {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    AI 智能修饰 <PointsBadge actionCode="style_apply" compact showIcon={false} className="ml-1" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: FILE UPLOAD + EDIT */}
                                {activeTab === 'file' && (
                                    <div className="flex flex-col gap-4 flex-1 min-h-0">
                                        {/* Upload Area - Show ONLY when NO file is attached */}
                                        {!attachedFile ? (
                                            <div
                                                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-3 relative shrink-0
                                                    ${isDragOver
                                                        ? 'border-indigo-400 bg-indigo-50/30'
                                                        : 'border-slate-300 bg-slate-50/30 hover:bg-slate-50 hover:border-indigo-300'}`}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={handleFileSelect}
                                                    accept=".txt,.md,.json,.pdf,.doc,.docx"
                                                />

                                                {isReadingFile ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Loader2 size={32} className="text-indigo-500 animate-spin" />
                                                        <p className="text-sm font-medium text-slate-600">正在解析文档内容...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-indigo-50 rounded-full text-indigo-400">
                                                            <Upload size={32} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-base font-medium text-slate-700 mb-1">点击或拖拽文件至此</p>
                                                            <p className="text-xs text-slate-400">支持 PDF, Word, MD, TXT</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            /* Editor Area - Show ONLY when file IS attached (Replaces Upload Area) */
                                            <>
                                                <div className="flex-1 min-h-0 relative">
                                                    {/* Preview Toggle Button */}
                                                    <div className="absolute top-3 right-3 z-10 flex gap-1">
                                                        <button
                                                            onClick={() => setIsPreviewing(!isPreviewing)}
                                                            title={isPreviewing ? "编辑内容" : "渲染预览"}
                                                            className={`flex items-center justify-center p-2 rounded-lg transition-all shadow-sm border
                                                                ${isPreviewing
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                        >
                                                            {isPreviewing ? <Edit3 size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>

                                                    <AIGlowContainer
                                                        isActive={isRefining || isGeneratingOutline}
                                                        className="w-full h-full rounded-xl"
                                                        colorFrom="#4f46e5"
                                                        colorTo="#8b5cf6"
                                                    >
                                                        {isPreviewing ? (
                                                            <ContentPreview content={fileParsedContent} />
                                                        ) : (
                                                            <textarea
                                                                value={fileParsedContent}
                                                                onChange={(e) => setFileParsedContent(e.target.value)}
                                                                placeholder="解析后的文档内容将显示在这里，您可以进行二次编辑..."
                                                                className="w-full h-full p-4 pr-32 text-base resize-none outline-none text-slate-700 placeholder:text-slate-300 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white transition-colors"
                                                            />
                                                        )}
                                                    </AIGlowContainer>
                                                </div>

                                                <div className="flex justify-between items-center shrink-0">
                                                    <span className="text-xs text-slate-400">系统将按照全局设置的 {config.targetPageCount} 页结构生成</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleClearFileAndContent}
                                                            className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                        >
                                                            清空
                                                        </button>
                                                        <button
                                                            onClick={handleRefine}
                                                            disabled={isRefining || !fileParsedContent.trim()}
                                                            className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 font-medium"
                                                        >
                                                            {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            AI 智能修饰 <PointsBadge actionCode="style_apply" compact showIcon={false} className="ml-1" />
                                                        </button>
                                                        {previousFileContentRef.current !== null && !isRefining && (
                                                            <button
                                                                onClick={() => { setFileParsedContent(previousFileContentRef.current!); previousFileContentRef.current = null; }}
                                                                className="text-xs flex items-center gap-1 bg-white text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 hover:shadow-sm transition-all font-medium"
                                                                title="撤回修饰"
                                                            >
                                                                <Undo2 size={12} />
                                                                撤回修饰
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}


                                {/* Shared Footer: Generate Button */}
                                <div className="mt-6 shrink-0">
                                    {/* Generate Button - Always Visible, Disabled during Generation */}
                                    <button
                                        onClick={handleGenerateOutline}
                                        // Determine disabled state based on active tab content
                                        disabled={isGeneratingOutline || !(activeTab === 'file' ? fileParsedContent.trim() : topic.trim())}
                                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {isGeneratingOutline ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                正在生成中...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 size={18} /> 一键生成 PPT 大纲 <PointsBadge actionCode="outline_generation" compact showIcon={false} className="text-white/80 bg-white/20 px-1.5 rounded-full" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Removed external button container */}

                        </div>
                    )}

                    {/* Step 2: Outline Structure */}
                    {step === 2 && (
                        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                            {/* ... Header logic similar, just updating grid content ... */}
                            <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#fafafa]/95 backdrop-blur-sm z-20 py-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">大纲预览</h3>
                                    <p className="text-sm text-slate-500">已生成 {outlineItems.length} 页 (目标 {config.targetPageCount} 页)</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleClearAllOutlineItems} disabled={isGeneratingOutline} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-500 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-red-50 transition-all disabled:opacity-50"><Eraser size={14} /> 清空内容</button>
                                    <button
                                        onClick={handleGenerateOutline}
                                        disabled={isGeneratingOutline}
                                        className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-200 shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingOutline ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                        重新生成大纲 <PointsBadge actionCode="outline_generation" compact />
                                    </button>
                                    <button onClick={proceedToDetails} disabled={isGeneratingOutline} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-medium disabled:opacity-50">
                                        下一步: 生成详细内容 <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 pb-24 transition-opacity duration-300 ${isGeneratingOutline ? 'opacity-30 pointer-events-none filter blur-[1px]' : 'opacity-100'}`}>
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
                                                <button
                                                    onClick={() => handleRegenerateSingleOutlineItem(item.id, item.index)}
                                                    disabled={loadingItems[item.id] || isGeneratingOutline}
                                                    className={`p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1 ${(loadingItems[item.id]) ? 'animate-spin' : ''}`}
                                                    title="重写此页"
                                                >
                                                    <RefreshCw size={16} />
                                                    <PointsBadge actionCode="outline_page_regen" compact showIcon={false} className="opacity-60 scale-75 origin-left" />
                                                </button>
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
                                    <button onClick={handleBatchGenerateDetails} disabled={isGeneratingDetails} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 font-medium relative group">
                                        {isGeneratingDetails ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />} {isGeneratingDetails ? "生成中..." : "批量生成详细描述"}
                                        {!isGeneratingDetails && (
                                            <PointsBadge
                                                actionCode="slide_content"
                                                multiplier={outlineItems.some(i => !i.fullContent) ? outlineItems.filter(i => !i.fullContent).length : outlineItems.length}
                                                compact
                                                showIcon={false}
                                                className="text-white/80 bg-white/20 px-1.5 rounded-full"
                                            />
                                        )}
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
                                                {/* Preview Toggle */}
                                                {item.fullContent && (
                                                    <button
                                                        onClick={() => setPreviewItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        className={`p-1.5 rounded-lg transition-colors ${previewItems[item.id]
                                                            ? 'bg-indigo-100 text-indigo-600'
                                                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                            }`}
                                                        title={previewItems[item.id] ? "编辑模式" : "预览模式"}
                                                    >
                                                        {previewItems[item.id] ? <Edit3 size={14} /> : <Eye size={14} />}
                                                    </button>
                                                )}
                                                {/* Clear Single */}
                                                <button onClick={() => handleClearSingleDetail(item.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors" title="清空内容"><Eraser size={14} /></button>
                                                {/* Regenerate Single */}
                                                <button onClick={() => generateDetailForId(item.id)} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors" title="重新生成"><RefreshCw size={14} /></button>
                                                {item.status === 'success' && <div className="text-green-500 bg-green-50 rounded-full p-1 ml-1"><Check size={12} /></div>}
                                                {item.status === 'error' && <div className="text-red-500 bg-red-50 rounded-full p-1 cursor-pointer ml-1" onClick={() => generateDetailForId(item.id)} title="点击重试">!</div>}
                                            </div>
                                        </div>
                                        <div className="relative p-4 flex-1 min-h-[240px] flex flex-col">
                                            {/* Status overlay */}
                                            {(!item.fullContent && item.status === 'idle') && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                                                    <button
                                                        onClick={() => generateDetailForId(item.id)}
                                                        className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1.5"
                                                    >
                                                        生成此页内容
                                                        <PointsBadge actionCode="slide_content" compact showIcon={false} className="opacity-70 group-hover:opacity-100" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Conditional Render: Preview or Edit */}
                                            {previewItems[item.id] && item.fullContent ? (
                                                <div className="w-full h-full min-h-[200px] overflow-y-auto custom-scrollbar">
                                                    <div className="prose prose-slate prose-sm max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.fullContent}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ) : (
                                                <AIGlowContainer
                                                    isActive={item.status === 'generating'}
                                                    className="w-full h-full flex-1"
                                                    colorFrom="#4f46e5"
                                                    colorTo="#8b5cf6"
                                                >
                                                    <textarea
                                                        value={item.fullContent || ''}
                                                        onChange={(e) => handleUpdateOutlineItem(item.id, { fullContent: e.target.value })}
                                                        placeholder={item.status === 'generating' ? "AI 正在思考中..." : "等待生成详细内容..."}
                                                        className={`w-full h-full min-h-[200px] resize-none focus:outline-none bg-transparent text-sm text-slate-600 leading-relaxed custom-scrollbar p-2 rounded-lg transition-all ${item.status === 'generating' ? 'bg-slate-50/50' : ''
                                                            }`}
                                                    />
                                                </AIGlowContainer>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
