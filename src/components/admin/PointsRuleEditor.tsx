
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { PointsRule } from '../../api/admin';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Search, Coins, Folder, Layers, Sparkles, BookOpen, Crown, Copy, Zap, Tag, Database, Clock, Check, X } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { AdminDrawer } from './shared';

// PointsRuleEditor.tsx - with Search & Filters & VIP Pricing

export const PointsRuleEditor: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PointsRule | null>(null);

    // Toggle Confirmation State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        rule: PointsRule | null;
        action: 'enable' | 'disable';
    }>({ isOpen: false, rule: null, action: 'enable' });

    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        ruleId: string;
        ruleName: string;
    }>({
        isOpen: false,
        ruleId: '',
        ruleName: ''
    });

    // Filter State
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [moduleTab, setModuleTab] = useState<'ALL' | '创作室' | '模版间'>('ALL');
    const [pointsRange, setPointsRange] = useState<'ALL' | 'FREE' | 'BASIC' | 'PREMIUM'>('ALL');
    const [vipFilter, setVipFilter] = useState<'ALL' | 'CONFIGURED' | 'NOT_CONFIGURED'>('ALL');

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        costPoints: 0,
        vipCostPoints: 0, // Added VIP cost
        description: '',
        module: '创作室',
        category: '文本生成',
        calculationMethod: '按次扣费',
        deductionLogic: '',
        isActive: true,
        effectiveAt: new Date().toISOString().split('T')[0]
    });

    const { data: rules, isLoading, error } = useQuery({
        queryKey: ['admin-points-rules'],
        queryFn: AdminApi.getPointsRules,
    });

    // Filter & Grouping Logic
    const groupedRules = React.useMemo(() => {
        if (!rules) return {};

        // Apply filters first
        const filtered = rules.filter(r => {
            const matchesKeyword = r.name.toLowerCase().includes(keyword.toLowerCase()) ||
                r.code.toLowerCase().includes(keyword.toLowerCase()) ||
                (r.module?.toLowerCase().includes(keyword.toLowerCase())) ||
                (r.category?.toLowerCase().includes(keyword.toLowerCase()));
            const matchesStatus = statusFilter === 'ALL'
                ? true
                : statusFilter === 'ACTIVE' ? r.isActive : !r.isActive;

            // Pts Range Filter
            let matchesPoints = true;
            if (pointsRange === 'FREE') matchesPoints = (r.costPoints === 0);
            else if (pointsRange === 'BASIC') matchesPoints = (r.costPoints > 0 && r.costPoints <= 5);
            else if (pointsRange === 'PREMIUM') matchesPoints = (r.costPoints > 5);

            // VIP Strategy Filter
            let matchesVip = true;
            if (vipFilter === 'CONFIGURED') matchesVip = (r.vipCostPoints !== null && r.vipCostPoints !== undefined && r.vipCostPoints !== r.costPoints);
            else if (vipFilter === 'NOT_CONFIGURED') matchesVip = (r.vipCostPoints === null || r.vipCostPoints === undefined || r.vipCostPoints === r.costPoints);

            return matchesKeyword && matchesStatus && matchesPoints && matchesVip;
        });

        // Group by Module only
        const groups: Record<string, PointsRule[]> = {};

        filtered.forEach(rule => {
            const mod = rule.module || '未分类';

            if (!groups[mod]) groups[mod] = [];
            groups[mod].push(rule);
        });

        // Sort rules within each module by sortOrder
        Object.keys(groups).forEach(mod => {
            groups[mod].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        });

        return groups;
    }, [rules, keyword, statusFilter, pointsRange, vipFilter]);

    const createMutation = useMutation({
        mutationFn: AdminApi.createPointsRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-points-rules'] });
            closeModal();
        },
        onError: (err: any) => alert(err.message)
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => AdminApi.updatePointsRule(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-points-rules'] });
            closeModal();
        },
        onError: (err: any) => alert(err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: AdminApi.deletePointsRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-points-rules'] });
        }
    });

    const openCreateModal = () => {
        setEditingRule(null);
        setFormData({
            code: '',
            name: '',
            costPoints: 0,
            vipCostPoints: 0,
            description: '',
            module: '创作室',
            category: '文本生成',
            calculationMethod: '按次扣费',
            deductionLogic: '',
            isActive: true,
            effectiveAt: new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const openEditModal = (rule: PointsRule) => {
        setEditingRule(rule);
        setFormData({
            code: rule.code,
            name: rule.name,
            costPoints: rule.costPoints,
            vipCostPoints: rule.vipCostPoints || 0,
            description: rule.description || '',
            module: rule.module || '创作室',
            category: rule.category || '文本生成',
            calculationMethod: rule.calculationMethod || '按次扣费',
            deductionLogic: rule.deductionLogic || '',
            isActive: rule.isActive,
            effectiveAt: rule.effectiveAt ? rule.effectiveAt.split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRule(null);
    };

    const handleCopyRule = (rule: PointsRule) => {
        setEditingRule(null);
        setFormData({
            code: `${rule.code}_copy`,
            name: `${rule.name} (副本)`,
            costPoints: rule.costPoints,
            vipCostPoints: rule.vipCostPoints || 0,
            description: rule.description || '',
            module: rule.module || '创作室',
            category: rule.category || '文本生成',
            calculationMethod: rule.calculationMethod || '按次扣费',
            deductionLogic: rule.deductionLogic || '',
            isActive: true, // 副本默认启用
            effectiveAt: new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const commonData = {
            name: formData.name,
            costPoints: Number(formData.costPoints),
            vipCostPoints: formData.vipCostPoints ? Number(formData.vipCostPoints) : null,
            description: formData.description,
            module: formData.module,
            category: formData.category,
            calculationMethod: formData.calculationMethod,
            deductionLogic: formData.deductionLogic,
            effectiveAt: formData.effectiveAt
        };

        if (editingRule) {
            updateMutation.mutate({
                id: editingRule.id,
                data: {
                    ...commonData,
                    isActive: formData.isActive,
                }
            });
        } else {
            createMutation.mutate({
                code: formData.code,
                ...commonData,
            });
        }
    };

    const handleDelete = (id: string, name: string) => {
        setDeleteDialog({
            isOpen: true,
            ruleId: id,
            ruleName: name
        });
    };

    const confirmDelete = async () => {
        try {
            await deleteMutation.mutateAsync(deleteDialog.ruleId);
            setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            alert('删除失败');
        }
    };

    const closeDeleteDialog = () => {
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleToggleActive = (rule: PointsRule) => {
        setConfirmModal({
            isOpen: true,
            rule: rule,
            action: rule.isActive ? 'disable' : 'enable'
        });
    };

    const confirmToggleActive = () => {
        if (!confirmModal.rule) return;

        updateMutation.mutate({
            id: confirmModal.rule.id,
            data: { isActive: !confirmModal.rule.isActive }
        }, {
            onSuccess: () => {
                setConfirmModal({ isOpen: false, rule: null, action: 'enable' });
            }
        });
    };

    const getCostColor = (cost: number) => {
        if (cost === 0) return 'text-emerald-500 bg-emerald-50';
        if (cost <= 5) return 'text-blue-500 bg-blue-50';
        if (cost <= 10) return 'text-violet-500 bg-violet-50';
        return 'text-rose-500 bg-rose-50';
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-64">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
            </div>
        </div>
    );

    if (error) return (
        <div className="p-6 bg-red-50/50 backdrop-blur-sm border border-red-200 text-red-600 rounded-2xl flex items-center gap-3">
            <AlertCircle size={24} />
            <span className="font-medium">{(error as any).message || "Failed to load rules"}</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro - Standardized Hero */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-6 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <Coins size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">积分规则配置</h1>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                管理系统各项 AI 能力的消耗定价与开关。
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="px-5 py-2.5 bg-white text-violet-600 rounded-xl shadow-lg shadow-black/10 font-bold text-sm hover:scale-105 active:scale-95 transition-all border border-white/50 flex items-center gap-2"
                    >
                        <Plus size={18} /> 新增规则
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="搜索规则名称或代码..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium"
                    />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all ${statusFilter === status
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {status === 'ALL' ? '全部状态' : status === 'ACTIVE' ? '已启用' : '已禁用'}
                        </button>
                    ))}
                </div>

                {/* New: Pts Range Filter */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['ALL', 'FREE', 'BASIC', 'PREMIUM'] as const).map((rng) => (
                        <button
                            key={rng}
                            onClick={() => setPointsRange(rng)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all ${pointsRange === rng
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {rng === 'ALL' ? '全额位' : rng === 'FREE' ? '免费' : rng === 'BASIC' ? '基础' : '高阶'}
                        </button>
                    ))}
                </div>

                {/* New: VIP Strategy Filter */}
                <div className="flex bg-amber-50 p-1 rounded-xl border border-amber-100/50">
                    {(['ALL', 'CONFIGURED', 'NOT_CONFIGURED'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setVipFilter(v)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 ${vipFilter === v
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-amber-400 hover:text-amber-600'
                                }`}
                        >
                            {v === 'CONFIGURED' && <Crown size={10} />}
                            {v === 'ALL' ? '全会员策略' : v === 'CONFIGURED' ? '专属价' : '未覆盖'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Module Tabs Navigation (Relocated to replace headers) */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                    {(['ALL', '创作室', '模版间'] as const).map((mod) => (
                        <button
                            key={mod}
                            onClick={() => setModuleTab(mod)}
                            className={`px-6 py-2.5 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 ${moduleTab === mod
                                ? 'bg-white text-violet-600 shadow-md shadow-violet-100 border border-violet-100'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                        >
                            {mod === 'ALL' ? <Layers size={16} /> : mod === '创作室' ? <Folder size={16} /> : <Sparkles size={16} />}
                            {mod === 'ALL' ? '全业务流' : mod}
                        </button>
                    ))}
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200/60 to-transparent" />
            </div>

            {/* Tab-driven Content Area */}
            <div className="space-y-6">
                {Object.entries(groupedRules).length === 0 ? (
                    <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
                        <Coins size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                        <p className="font-bold text-slate-400">暂无匹配的规则数据</p>
                    </div>
                ) : (
                    Object.entries(groupedRules)
                        .filter(([moduleName]) => moduleTab === 'ALL' || moduleName === moduleTab)
                        .map(([moduleName, moduleRules]) => (
                            <div key={moduleName} className="space-y-6">

                                {/* Grid of Rules (Flat & Sorted by path) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                    {(moduleRules as PointsRule[]).map((rule) => {
                                        const costStyle = getCostColor(rule.costPoints);
                                        return (
                                            <div
                                                key={rule.id}
                                                className={`group relative bg-white/80 backdrop-blur-xl rounded-2xl p-4 pb-3 border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${!rule.isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}
                                            >
                                                {/* Status Badge */}
                                                <div className="absolute top-4 right-4 z-10">
                                                    <div
                                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border pointer-events-none ${rule.isActive
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-500/10'
                                                            : 'bg-slate-50 text-slate-400 border-slate-200'
                                                            }`}
                                                    >
                                                        <div className={`w-1 h-1 rounded-full ${rule.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                        {rule.isActive ? "已启用" : "已禁用"}
                                                    </div>
                                                </div>

                                                {/* Header & Meta (Fixed height for grid alignment) */}
                                                <div className="mb-4 h-[84px] flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="text-[15px] font-black text-slate-800 mb-1.5 line-clamp-1 pr-16" title={rule.name}>
                                                            {rule.name}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <code className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono tracking-tight grayscale-[0.5] max-w-[100px] truncate">
                                                                {rule.code}
                                                            </code>
                                                            {rule.category && (
                                                                <span className="text-[9px] font-black text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100 uppercase tracking-tighter whitespace-nowrap">
                                                                    {rule.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[9px] text-slate-400/80">
                                                        <span className="opacity-60">生效日期:</span>
                                                        <span className="font-bold">{new Date(rule.effectiveAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                {/* Pricing Info */}
                                                <div className="bg-slate-50/50 rounded-xl py-3 px-3.5 mb-3 border border-slate-100 grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col border-r border-slate-200/50 pr-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5 tracking-tighter">标准消耗</span>
                                                        <span className={`text-xl font-black truncate ${costStyle.split(' ')[0]}`}>{rule.costPoints}</span>
                                                    </div>
                                                    <div className="flex flex-col pl-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5 flex items-center gap-1 tracking-tighter">
                                                            <Crown size={8} className="text-amber-500" /> VIP 消耗
                                                        </span>
                                                        {rule.vipCostPoints !== null && rule.vipCostPoints !== undefined ? (
                                                            <span className="text-xl font-black text-amber-500 truncate">{rule.vipCostPoints}</span>
                                                        ) : (
                                                            <span className="text-[11px] font-bold text-slate-300 mt-1">未配置</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50/30 rounded-lg p-2 mb-3 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                                                    <span>计费方式</span>
                                                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-600 font-black">
                                                        {rule.calculationMethod || '按次扣费'}
                                                    </span>
                                                </div>

                                                {/* Logic Description (Constrained space for grid) */}
                                                <div className="flex-grow space-y-1.5 mb-3 px-0.5 min-h-[34px]">
                                                    <div className="flex items-start gap-1.5">
                                                        <Sparkles size={10} className="text-indigo-400 mt-0.5 shrink-0 opacity-70" />
                                                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 font-medium">
                                                            {rule.deductionLogic || rule.description || "暂无详细描述"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Footer Actions */}
                                                <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 mt-auto min-h-[40px] relative">
                                                    <div className="flex items-center gap-2">
                                                        {rule.createdBy ? (
                                                            <div className="flex items-center gap-1.5 py-1">
                                                                <div className="w-5 h-5 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center overflow-hidden shadow-sm">
                                                                    {rule.createdBy.avatar ? (
                                                                        <img src={rule.createdBy.avatar} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-[9px] text-violet-500 font-bold">{rule.createdBy.nickname?.[0] || 'A'}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">创建人</span>
                                                                    <span className="text-[10px] font-black text-slate-700 leading-none">{rule.createdBy.nickname}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 py-1">
                                                                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center grayscale">
                                                                    <Loader2 size={10} className="text-slate-300 animate-spin" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter leading-none mb-0.5">管理员</span>
                                                                    <span className="text-[10px] font-black text-slate-400 leading-none">系统预设</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Hover Actions - Absolute positioned to save space and show creator */}
                                                    <div className="absolute inset-y-0 right-0 flex items-center gap-1 bg-white/95 backdrop-blur-sm pl-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                        <button
                                                            onClick={() => handleToggleActive(rule)}
                                                            title={rule.isActive ? "禁用规则" : "启用规则"}
                                                            className={`p-2 rounded-lg transition-all ${rule.isActive
                                                                ? 'text-amber-500 hover:bg-amber-50'
                                                                : 'text-emerald-500 hover:bg-emerald-50'
                                                                }`}
                                                        >
                                                            {rule.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(rule)}
                                                            title="编辑规则"
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCopyRule(rule)}
                                                            title="复制规则"
                                                            className="p-2 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(rule.id, rule.name)}
                                                            title="删除规则"
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Always show Add New button at the very bottom */}
            <div className="pt-6 flex justify-center">
                <button
                    onClick={openCreateModal}
                    className="group flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-violet-50 hover:border-violet-200 transition-all duration-300 w-full max-w-[280px]"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Plus className="text-slate-400 group-hover:text-violet-500" size={20} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-400 group-hover:text-violet-600">添加全局积分规则</span>
                </button>
            </div>

            {/* Modal for creating/editing rules - Refactored to Side Drawer */}
            <AdminDrawer
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingRule ? '编辑积分规则' : '新增积分规则'}
                description={editingRule ? 'Update Points Rule' : 'Create New Reward Policy'}
                width="narrow"
                footer={
                    <div className="flex items-center gap-4 w-full">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all text-xs tracking-widest uppercase"
                        >
                            取消返回
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="flex-[2] py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black hover:shadow-xl hover:shadow-violet-500/25 transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                            {createMutation.isPending || updateMutation.isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    正在同步
                                </>
                            ) : (
                                '保存规则配置'
                            )}
                        </button>
                    </div>
                }
            >
                <div className="space-y-10 pb-8 text-left">
                    {/* Rule Type Illustration/Icon */}
                    <div className="relative p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] border border-amber-100/50 shadow-sm overflow-hidden text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="relative w-16 h-16 mx-auto bg-white rounded-3xl shadow-sm flex items-center justify-center text-amber-600 mb-3 border border-amber-50">
                            <Zap size={32} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">配置自动化积分消耗逻辑</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Define module triggers and point costs</p>
                    </div>

                    <div className="space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">基础信息配置</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">规则显示名称</label>
                                <div className="relative group text-left">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all"
                                        placeholder="例如：生成文本大纲"
                                    />
                                </div>
                            </div>

                            {!editingRule && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">唯一识别代码 (Action Code)</label>
                                    <div className="relative group text-left">
                                        <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all font-mono"
                                            placeholder="outline_generation"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 ml-1 flex items-center gap-1 font-medium">
                                        <AlertCircle size={10} />
                                        后端调用的唯一性凭证，保存后不可更改
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Values */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">成本设置 (Points)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">标准消耗积分</label>
                                    <div className="relative group text-left">
                                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={formData.costPoints}
                                            onChange={e => setFormData({ ...formData, costPoints: Number(e.target.value) })}
                                            className="w-full pl-12 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">PTS</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-amber-600 mb-2 ml-1 flex items-center gap-1">
                                        <Crown size={12} /> VIP 优惠积分
                                    </label>
                                    <div className="relative group text-left">
                                        <Crown className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.vipCostPoints}
                                            onChange={e => setFormData({ ...formData, vipCostPoints: Number(e.target.value) })}
                                            className="w-full pl-12 pr-12 py-3 bg-amber-50/50 border-2 border-amber-100/50 rounded-2xl text-sm font-bold focus:bg-white focus:border-amber-500 outline-none transition-all"
                                            placeholder="默认同上"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded uppercase">PTS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Categorization */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">业务与归类</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">所属板块 (Module)</label>
                                    <div className="relative group text-left">
                                        <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select
                                            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all appearance-none cursor-pointer"
                                            value={formData.module}
                                            onChange={e => setFormData({ ...formData, module: e.target.value })}
                                        >
                                            <option value="创作室">创作室 (Creation)</option>
                                            <option value="模版间">模版间 (Templates)</option>
                                            <option value="高级工具">高级工具 (Tools)</option>
                                            <option value="系统配置">系统配置 (System)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Layers size={12} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">二级分类 (Category)</label>
                                    <div className="relative group text-left">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                                            placeholder="例如: 文本生成"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">计算方式</label>
                                    <div className="relative group text-left">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                                            placeholder="例如: 按次、按页"
                                            value={formData.calculationMethod}
                                            onChange={e => setFormData({ ...formData, calculationMethod: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">生效日期</label>
                                    <div className="relative group text-left">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all font-mono"
                                            value={formData.effectiveAt}
                                            onChange={e => setFormData({ ...formData, effectiveAt: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logic Textarea */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">扣费逻辑详情</h4>
                            <div className="relative group text-left">
                                <textarea
                                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm font-medium focus:bg-white focus:border-violet-500 outline-none transition-all resize-none leading-relaxed"
                                    rows={4}
                                    placeholder="请详细描述该规则的扣费逻辑，此内容将展示给用户..."
                                    value={formData.deductionLogic}
                                    onChange={e => setFormData({ ...formData, deductionLogic: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 ml-2 flex items-center gap-1.5 font-medium leading-relaxed">
                                <Sparkles size={12} className="text-violet-400" />
                                提示：详细的描述有助于降低用户的理解成本，增加计费透明度。
                            </p>
                        </div>
                    </div>
                </div>
            </AdminDrawer>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${confirmModal.action === 'enable' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                            }`}>
                            {confirmModal.action === 'enable' ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                        </div>

                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                            确认{confirmModal.action === 'enable' ? '启用' : '禁用'}规则？
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            您正在对 <span className="font-bold text-slate-700">[{confirmModal.rule?.name}]</span> 进行状态切换。
                            {confirmModal.action === 'disable' ? '禁用后，用户执行相关操作时将不再产生扣费。' : '启用后，将立即恢复计费逻辑。'}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, rule: null, action: 'enable' })}
                                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmToggleActive}
                                disabled={updateMutation.isPending}
                                className={`flex-[1.5] py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 ${confirmModal.action === 'enable'
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                                    }`}
                            >
                                {updateMutation.isPending ? '处理中...' : `确认${confirmModal.action === 'enable' ? '启用' : '禁用'}`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 删除确认对话框 */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="确认删除"
                message={`确定要删除规则「${deleteDialog.ruleName}」吗？此操作不可恢复。`}
                onConfirm={confirmDelete}
                onCancel={closeDeleteDialog}
                type="danger"
                confirmText="删除"
                cancelText="取消"
            />
        </div >
    );
};
