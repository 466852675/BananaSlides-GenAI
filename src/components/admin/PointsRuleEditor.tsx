import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { PointsRule } from '../../api/admin';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const PointsRuleEditor: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PointsRule | null>(null);

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

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600" /></div>;
    if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2"><AlertCircle size={20} /> {(error as any).message}</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">积分规则管理</h2>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                >
                    <Plus size={16} /> 新增规则
                </button>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100">
                {rules?.map((rule) => (
                    <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-semibold text-gray-800">{rule.name}</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">{rule.code}</span>
                                {rule.isActive ?
                                    <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle size={12} /> 已启用</span> :
                                    <span className="text-gray-400 text-xs flex items-center gap-1"><XCircle size={12} /> 已禁用</span>
                                }
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-4">
                                <span>消耗: <b className="text-purple-600">{rule.costPoints}</b> 积分</span>
                                {rule.description && <span className="text-gray-400 border-l border-gray-200 pl-4">{rule.description}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleToggleActive(rule)}
                                className={`p-2 rounded-lg transition-colors ${rule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={rule.isActive ? "禁用" : "启用"}
                            >
                                {rule.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            </button>
                            <button
                                onClick={() => openEditModal(rule)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="编辑"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                            {editingRule ? '编辑规则' : '新增规则'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!editingRule && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">规则代码 (Code)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                        placeholder="例如: outline_generation"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">系统内部使用的唯一标识符，创建后不可修改。</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">规则名称</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    placeholder="例如: 生成大纲"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">消耗积分</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.costPoints}
                                    onChange={e => setFormData({ ...formData, costPoints: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">描述 (可选)</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
