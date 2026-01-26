import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { PointsRule } from '../../api/admin';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Search, Coins, Folder, Layers, Sparkles, BookOpen } from 'lucide-react';

// PointsRuleEditor.tsx - with Search & Filters

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

    // Filter State
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        costPoints: 0,
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
            return matchesKeyword && matchesStatus;
        });

        // Group by Module -> Category
        const groups: Record<string, Record<string, PointsRule[]>> = {};

        filtered.forEach(rule => {
            const mod = rule.module || '未分类';
            const cat = rule.category || '通用';

            if (!groups[mod]) groups[mod] = {};
            if (!groups[mod][cat]) groups[mod][cat] = [];

            groups[mod][cat].push(rule);
        });

        return groups;
    }, [rules, keyword, statusFilter]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRule) {
            updateMutation.mutate({
                id: editingRule.id,
                data: {
                    name: formData.name,
                    costPoints: Number(formData.costPoints),
                    description: formData.description,
                    module: formData.module,
                    category: formData.category,
                    calculationMethod: formData.calculationMethod,
                    deductionLogic: formData.deductionLogic,
                    isActive: formData.isActive,
                    effectiveAt: formData.effectiveAt
                }
            });
        } else {
            createMutation.mutate({
                code: formData.code,
                name: formData.name,
                costPoints: Number(formData.costPoints),
                description: formData.description,
                module: formData.module,
                category: formData.category,
                calculationMethod: formData.calculationMethod,
                deductionLogic: formData.deductionLogic,
                effectiveAt: formData.effectiveAt
            });
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('确定要删除此规则吗？')) {
            deleteMutation.mutate(id);
        }
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
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-8 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <Coins size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-2">积分规则配置</h1>
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
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === status
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {status === 'ALL' ? '全部' : status === 'ACTIVE' ? '启用' : '禁用'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grouped Content */}
            <div className="space-y-12">
                {Object.entries(groupedRules).length === 0 ? (
                    <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
                        <Coins size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                        <p className="font-bold text-slate-400">暂无匹配的规则数据</p>
                    </div>
                ) : (
                    Object.entries(groupedRules).map(([moduleName, categories]) => (
                        <div key={moduleName} className="space-y-6">
                            {/* Module Header */}
                            <div className="flex items-center gap-3 px-2">
                                <div className="p-2 bg-violet-600 rounded-xl text-white shadow-lg shadow-violet-200">
                                    <Folder size={20} />
                                </div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">{moduleName} 板块</h2>
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4" />
                            </div>

                            {Object.entries(categories).map(([categoryName, categoryRules]) => (
                                <div key={categoryName} className="space-y-4 pl-4">
                                    {/* Category Subheader */}
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-violet-400" />
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{categoryName}</h3>
                                    </div>

                                    {/* Grid of Rules */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {categoryRules.map((rule) => {
                                            const costStyle = getCostColor(rule.costPoints);
                                            return (
                                                <div
                                                    key={rule.id}
                                                    className={`group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 ${!rule.isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}
                                                >
                                                    {/* Status Badge (Static Display) */}
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

                                                    {/* Header: Name & Code */}
                                                    <div className="mb-6 pr-20">
                                                        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={rule.name}>{rule.name}</h3>
                                                        <code className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono tracking-tight">
                                                            {rule.code}
                                                        </code>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                <span className="opacity-60">创建:</span>
                                                                <span className="font-bold">{new Date(rule.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                            <div className="flex items-center gap-1 text-[10px] text-indigo-500">
                                                                <span className="opacity-60">生效:</span>
                                                                <span className="font-bold">{new Date(rule.effectiveAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Main Info Box */}
                                                    <div className="bg-slate-50/50 rounded-2xl p-4 mb-4 border border-slate-100">
                                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">消耗积分</span>
                                                                <span className={`text-2xl font-black ${costStyle.split(' ')[0]}`}>{rule.costPoints} <span className="text-xs font-bold">PTS</span></span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">计算方式</span>
                                                                <div className="text-xs font-bold text-slate-600 mt-1">{rule.calculationMethod || '按次扣费'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-start gap-2">
                                                                <Sparkles size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                                    <span className="font-bold">扣费逻辑：</span>
                                                                    {rule.deductionLogic || rule.description || "暂无详细描述"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Footer */}
                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/60">
                                                        <div className="flex items-center gap-2">
                                                            {rule.createdBy && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-4 h-4 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center overflow-hidden">
                                                                        {rule.createdBy.avatar ? (
                                                                            <img src={rule.createdBy.avatar} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="text-[8px] text-violet-500 font-bold">{rule.createdBy.nickname[0]}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-400">{rule.createdBy.nickname}</span>
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] font-bold text-slate-300 font-mono">
                                                                REV: {rule.id.split('-')[0]}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                                onClick={() => handleDelete(rule.id)}
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
                            ))}
                        </div>
                    ))
                )}

                {/* Always show Add New button at the very bottom */}
                <div className="pt-8 flex justify-center">
                    <button
                        onClick={openCreateModal}
                        className="group flex flex-col items-center justify-center gap-4 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:bg-violet-50 hover:border-violet-200 transition-all duration-300 w-full max-w-sm"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Plus className="text-slate-400 group-hover:text-violet-500" size={24} />
                        </div>
                        <span className="text-sm font-bold text-slate-400 group-hover:text-violet-600">添加全局积分规则</span>
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200 border border-white/20">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {editingRule ? '编辑规则' : '新增规则'}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">配置积分消耗逻辑</p>
                            </div>
                            <div className="p-2 bg-violet-50 rounded-xl text-violet-500">
                                <CheckCircle size={24} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!editingRule && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">规则代码 (Code)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-mono text-sm"
                                        placeholder="例如: outline_generation"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium">Unique identifier, cannot be changed once created.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">规则名称</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                                        placeholder="例如: 生成大纲"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">消耗积分</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-mono font-bold text-slate-700"
                                            value={formData.costPoints}
                                            onChange={e => setFormData({ ...formData, costPoints: Number(e.target.value) })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">PTS</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">一级板块 (Module)</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                                        value={formData.module}
                                        onChange={e => setFormData({ ...formData, module: e.target.value })}
                                    >
                                        <option value="创作室">创作室</option>
                                        <option value="模版库">模版库</option>
                                        <option value="高级工具">高级工具</option>
                                        <option value="系统配置">系统配置</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">二级分类 (Category)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                                        placeholder="例如: 文本生成"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">计算方式</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                                        placeholder="例如: 按次、按页"
                                        value={formData.calculationMethod}
                                        onChange={e => setFormData({ ...formData, calculationMethod: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">生效时间</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-slate-700 font-mono"
                                        value={formData.effectiveAt}
                                        onChange={e => setFormData({ ...formData, effectiveAt: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">详细扣费逻辑</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all resize-none text-sm leading-relaxed"
                                    rows={3}
                                    placeholder="描述详细的计算公式和扣费条件..."
                                    value={formData.deductionLogic}
                                    onChange={e => setFormData({ ...formData, deductionLogic: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 font-medium">此内容将同步展示在创作室的功能操作提示中。</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-8 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {createMutation.isPending || updateMutation.isPending ? '保存中...' : '确认保存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                </div>
            )}
        </div>
    );
};
