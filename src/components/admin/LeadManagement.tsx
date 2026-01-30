
// src/components/admin/LeadManagement.tsx
// 销售线索管理页面

import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    RefreshCcw,
    MoreHorizontal,
    Phone,
    Mail,
    Briefcase,
    Building2,
    CheckCircle2,
    XCircle,
    Clock,
    MessageSquare,
    User,
    Trash2
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
    'PENDING': '待处理',
    'CONTACTED': '已跟进',
    'QUALIFIED': '高意向',
    'CONVERTED': '已成交',
    'CLOSED': '已关闭'
};

const STATUS_COLORS: Record<string, string> = {
    'PENDING': 'bg-amber-50 text-amber-600 border-amber-200',
    'CONTACTED': 'bg-blue-50 text-blue-600 border-blue-200',
    'QUALIFIED': 'bg-purple-50 text-purple-600 border-purple-200',
    'CONVERTED': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'CLOSED': 'bg-slate-50 text-slate-500 border-slate-200'
};

export const LeadManagement: React.FC = () => {
    const [leads, setLeads] = useState<AdminAPI.Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [keyword, setKeyword] = useState('');

    // 编辑状态
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStatus, setEditStatus] = useState<string>('');
    const [editNotes, setEditNotes] = useState<string>('');

    useEffect(() => {
        fetchLeads();
    }, [page, statusFilter]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const result = await AdminAPI.getLeads({
                page,
                pageSize: 10,
                status: statusFilter,
                keyword
            });
            setLeads(result.items);
            setTotal(result.pagination.total);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLeads();
    };

    const handleUpdateStatus = async (id: string) => {
        try {
            await AdminAPI.updateLeadStatus(id, editStatus, editNotes);
            setEditingId(null);
            fetchLeads(); // 刷新列表
        } catch (error) {
            alert('更新状态失败');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`确定要删除线索「${name}」吗？此操作不可恢复。`)) return;
        try {
            await AdminAPI.deleteLead(id);
            fetchLeads(); // 刷新列表
        } catch (error) {
            alert('删除失败');
        }
    };

    const openEdit = (lead: AdminAPI.Lead) => {
        setEditingId(lead.id);
        setEditStatus(lead.status);
        setEditNotes(lead.notes || '');
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜索姓名、公司或手机号..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                    >
                        搜索
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <Filter size={16} className="text-slate-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                        >
                            <option value="">全部状态</option>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => fetchLeads()}
                        className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                        title="刷新"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-200 border-t-violet-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-medium">加载数据中...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {leads.map((lead) => (
                        <div key={lead.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
                                {/* Lead Info */}
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-bold text-lg">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                    {lead.name}
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}>
                                                        {STATUS_LABELS[lead.status] || lead.status}
                                                    </span>
                                                </h3>
                                                <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                                    <Clock size={12} />
                                                    {format(new Date(lead.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                                    {lead.source && <span className="text-slate-300">|</span>}
                                                    {lead.source && <span>来源: {lead.source}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions for Mobile handled via layout */}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Building2 size={16} className="text-slate-400" />
                                            <span className="font-medium">{lead.company || '-'}</span>
                                            {lead.position && <span className="text-slate-400">({lead.position})</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone size={16} className="text-slate-400" />
                                            <span className="font-mono">{lead.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail size={16} className="text-slate-400" />
                                            <span className="truncate max-w-[200px]" title={lead.email || ''}>{lead.email || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Briefcase size={16} className="text-slate-400" />
                                            <span>{lead.industry || '未知行业'} · {lead.teamSize || '规模未知'}</span>
                                        </div>
                                        {lead.userId && (
                                            <div className="flex items-center gap-2 text-indigo-600">
                                                <User size={16} />
                                                <span className="font-medium">已关联用户ID: {lead.userId.slice(0, 8)}...</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 leading-relaxed border border-slate-100">
                                        <span className="font-bold text-slate-800 block mb-1">需求描述：</span>
                                        {lead.needs || '无'}
                                    </div>

                                    {lead.notes && (
                                        <div className="bg-amber-50/50 rounded-xl p-3 text-sm text-amber-800/80 border border-amber-100 flex gap-2">
                                            <MessageSquare size={16} className="shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold text-amber-900 block text-xs mb-1">跟进记录：</span>
                                                {lead.notes}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Panel */}
                                <div className="w-full lg:w-72 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col gap-3">
                                    {editingId === lead.id ? (
                                        <div className="space-y-3 animate-in fade-in zoom-in-95">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">更新状态</label>
                                                <select
                                                    value={editStatus}
                                                    onChange={(e) => setEditStatus(e.target.value)}
                                                    className="w-full p-2 text-sm border rounded-lg"
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                        <option key={k} value={k}>{v}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">添加备注</label>
                                                <textarea
                                                    value={editNotes}
                                                    onChange={(e) => setEditNotes(e.target.value)}
                                                    className="w-full p-2 text-sm border rounded-lg h-24 resize-none focus:ring-2 focus:ring-violet-500/20 outline-none"
                                                    placeholder="填写跟进情况..."
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdateStatus(lead.id)}
                                                    className="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-violet-700"
                                                >
                                                    保存
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-4 bg-white border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-bold hover:bg-slate-50"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => openEdit(lead)}
                                                className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <MessageSquare size={16} />
                                                跟进 / 更新状态
                                            </button>
                                            {lead.status === 'PENDING' && (
                                                <button
                                                    onClick={() => {
                                                        setEditStatus('CONTACTED');
                                                        setEditNotes(lead.notes || '');
                                                        handleUpdateStatus(lead.id); // 快速标记为已跟进
                                                    }}
                                                    className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    标记已联系
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(lead.id, lead.name)}
                                                className="w-full py-2 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                删除
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {leads.length === 0 && (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                            <div className="text-4xl mb-4">📭</div>
                            <h3 className="text-lg font-bold text-slate-700">暂无销售线索</h3>
                            <p className="text-slate-400 text-sm mt-2">在这里管理所有来自企业版咨询的客户意向</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination Info */}
            {!loading && total > 0 && (
                <div className="flex justify-center text-sm text-slate-500 font-medium">
                    Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} of {total} leads
                </div>
            )}
        </div>
    );
};
