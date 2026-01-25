import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { PointsRule } from '../../api/admin';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Search, Coins } from 'lucide-react';

// PointsRuleEditor.tsx - with Search & Filters

export const PointsRuleEditor: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PointsRule | null>(null);

    // Filter State
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        costPoints: 0,
        description: '',
        isActive: true
    });

    const { data: rules, isLoading, error } = useQuery({
        queryKey: ['admin-points-rules'],
        queryFn: AdminApi.getPointsRules,
    });

    // Filter Logic
    const filteredRules = React.useMemo(() => {
        if (!rules) return [];
        return rules.filter(r => {
            const matchesKeyword = r.name.toLowerCase().includes(keyword.toLowerCase()) ||
                r.code.toLowerCase().includes(keyword.toLowerCase());
            const matchesStatus = statusFilter === 'ALL'
                ? true
                : statusFilter === 'ACTIVE' ? r.isActive : !r.isActive;
            return matchesKeyword && matchesStatus;
        });
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
        setFormData({ code: '', name: '', costPoints: 0, description: '', isActive: true });
        setIsModalOpen(true);
    };

    const openEditModal = (rule: PointsRule) => {
        setEditingRule(rule);
        setFormData({
            code: rule.code,
            name: rule.name,
            costPoints: rule.costPoints,
            description: rule.description || '',
            isActive: rule.isActive
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
                    isActive: formData.isActive
                }
            });
        } else {
            createMutation.mutate({
                code: formData.code,
                name: formData.name,
                costPoints: Number(formData.costPoints),
                description: formData.description
            });
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('确定要删除此规则吗？')) {
            deleteMutation.mutate(id);
        }
    };

    const handleToggleActive = (rule: PointsRule) => {
        updateMutation.mutate({
            id: rule.id,
            data: { isActive: !rule.isActive }
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
                            <p className="text-violet-100 font-medium opacity-90">
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

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRules.map((rule) => {
                    const costStyle = getCostColor(rule.costPoints);

                    return (
                        <div
                            key={rule.id}
                            className={`group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 ${!rule.isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}
                        >
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={() => handleToggleActive(rule)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${rule.isActive
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    {rule.isActive ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            已启用
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            已禁用
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Header: Name & Code */}
                            <div className="mb-6 pr-20">
                                <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={rule.name}>{rule.name}</h3>
                                <code className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono tracking-tight">
                                    {rule.code}
                                </code>
                            </div>

                            {/* Cost Display */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 ${costStyle.replace('bg-', 'border-').replace('text-', '')} bg-white shadow-sm`}>
                                    <div className={`text-2xl font-black ${costStyle.split(' ')[0]}`}>{rule.costPoints}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">积分</div>
                                </div>
                                <div className="flex-1 text-sm text-slate-500 leading-relaxed line-clamp-2" title={rule.description}>
                                    {rule.description || "暂无描述信息"}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100/60">
                                <div className="text-xs font-bold text-slate-300">
                                    ID: {rule.id.slice(0, 8)}...
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(rule)}
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="编辑设置"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rule.id)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="删除规则"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State / Add New Card */}
                <button
                    onClick={openCreateModal}
                    className="group relative flex flex-col items-center justify-center gap-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-6 hover:bg-violet-50/50 hover:border-violet-200 transition-all duration-300 h-full min-h-[200px]"
                >
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Plus className="text-slate-400 group-hover:text-violet-500" size={32} />
                    </div>
                    <div className="text-sm font-bold text-slate-400 group-hover:text-violet-600">
                        添加新规则
                    </div>
                </button>

                {filteredRules.length === 0 && rules && rules.length > 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                        没有找到匹配的规则
                    </div>
                )}
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

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">规则描述</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all resize-none text-sm"
                                    rows={3}
                                    placeholder="描述该规则的用途..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
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
        </div>
    );
};
