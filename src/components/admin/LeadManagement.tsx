
// src/components/admin/LeadManagement.tsx
// 销售线索管理页面

import React, { useState, useEffect, useCallback } from 'react';
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
    Trash2,
    ClipboardList,
    X
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ConfirmDialog } from '../ConfirmDialog';
import { PermissionTooltip } from '../PermissionTooltip';
import { LeadDetailDrawer } from './LeadDetailDrawer';

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

    // 确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        leadId: string;
        leadName: string;
    }>({
        isOpen: false,
        leadId: '',
        leadName: ''
    });

    // 标记已联系确认对话框
    const [contactDialog, setContactDialog] = useState<{
        isOpen: boolean;
        leadId: string;
        leadName: string;
    }>({
        isOpen: false,
        leadId: '',
        leadName: ''
    });

    // 详情抽屉状态
    const [selectedLead, setSelectedLead] = useState<AdminAPI.Lead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // 防抖函数
    const debounce = (fn: Function, delay: number) => {
        let timer: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    const fetchLeads = useCallback(async () => {
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
    }, [page, statusFilter, keyword]);

    // 防抖搜索
    const debouncedFetchLeads = useCallback(
        debounce(() => {
            setPage(1);
            fetchLeads();
        }, 300),
        [fetchLeads]
    );

    useEffect(() => {
        fetchLeads();
    }, [page, statusFilter]);

    // 当 keyword 变化时，防抖搜索
    useEffect(() => {
        debouncedFetchLeads();
    }, [keyword, debouncedFetchLeads]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLeads();
    };

    const clearSearch = () => {
        setKeyword('');
    };

    const handleUpdateStatus = async (id: string) => {
        try {
            await AdminAPI.updateLeadStatus(id, editStatus, editNotes);
            setEditingId(null);
            fetchLeads(); // 刷新列表
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        setDeleteDialog({
            isOpen: true,
            leadId: id,
            leadName: name
        });
    };

    const confirmDelete = async () => {
        try {
            await AdminAPI.deleteLead(deleteDialog.leadId);
            setDeleteDialog(prev => ({ ...prev, isOpen: false }));
            fetchLeads();
        } catch (error) {
            alert('删除失败');
        }
    };

    const closeDeleteDialog = () => {
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleMarkContactedClick = (lead: AdminAPI.Lead) => {
        setContactDialog({
            isOpen: true,
            leadId: lead.id,
            leadName: lead.name
        });
    };

    const confirmMarkContacted = async () => {
        try {
            setEditStatus('CONTACTED');
            setEditNotes('');
            await AdminAPI.updateLeadStatus(contactDialog.leadId, 'CONTACTED', '');
            setContactDialog(prev => ({ ...prev, isOpen: false }));
            fetchLeads();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const closeContactDialog = () => {
        setContactDialog(prev => ({ ...prev, isOpen: false }));
    };

    const openEdit = (lead: AdminAPI.Lead) => {
        setEditingId(lead.id);
        setEditStatus(lead.status);
        setEditNotes(lead.notes || '');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro - Standardized Hero */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-6 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">销售线索</h1>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                企业版咨询与客户跟进
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar - Glassmorphism Style */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-sm flex flex-wrap items-center gap-4">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="搜索姓名、公司或手机号..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium"
                    />
                    {keyword && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="清除搜索"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Status Filter - Segmented Control */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all ${statusFilter === ''
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        全部状态
                    </button>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all ${statusFilter === key
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Refresh Button */}
                <button
                    onClick={() => fetchLeads()}
                    className="p-3 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                    title="刷新"
                >
                    <RefreshCcw size={18} />
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {leads.map((lead) => (
                        <div 
                            key={lead.id} 
                            className="group bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer"
                            onClick={() => {
                                setSelectedLead(lead);
                                setIsDetailOpen(true);
                            }}
                        >
                            {/* Hover Actions - Top Right */}
                            {editingId !== lead.id && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-slate-100 z-20">
                                    <PermissionTooltip requiredPermission="admin.leads.manage.note">
                                        <button
                                            onClick={() => openEdit(lead)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="跟进"
                                        >
                                            <MessageSquare size={16} />
                                        </button>
                                    </PermissionTooltip>
                                    {lead.status === 'PENDING' && (
                                        <PermissionTooltip requiredPermission="admin.leads.manage.status">
                                            <button
                                                onClick={() => handleMarkContactedClick(lead)}
                                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="标记已联系"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        </PermissionTooltip>
                                    )}
                                    <PermissionTooltip requiredPermission="admin.leads.delete">
                                        <button
                                            onClick={() => handleDelete(lead.id, lead.name)}
                                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </PermissionTooltip>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                {/* Header: Avatar + Name + Status + Time */}
                                <div className="flex items-start gap-4 pr-32">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-bold text-lg shrink-0">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-[15px] font-black text-slate-800">{lead.name}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}>
                                                {STATUS_LABELS[lead.status] || lead.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={11} />
                                                {format(new Date(lead.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                            </span>
                                            {lead.source && (
                                                <span className="text-slate-300">|</span>
                                            )}
                                            {lead.source && (
                                                <span>来源: {lead.source}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="flex items-center gap-2 text-[12px] text-slate-600 bg-slate-50/50 rounded-lg p-2">
                                        <Building2 size={14} className="text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            <span className="font-bold">{lead.company || '-'}</span>
                                            {lead.position && <span className="text-slate-400 ml-1">({lead.position})</span>}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] text-slate-600 bg-slate-50/50 rounded-lg p-2">
                                        <Phone size={14} className="text-slate-400 shrink-0" />
                                        <span className="font-mono truncate">{lead.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] text-slate-600 bg-slate-50/50 rounded-lg p-2">
                                        <Mail size={14} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{lead.email || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] text-slate-600 bg-slate-50/50 rounded-lg p-2">
                                        <Briefcase size={14} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{lead.industry || '未知行业'} · {lead.teamSize || '规模未知'}</span>
                                    </div>
                                </div>

                                {/* Needs Description */}
                                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">需求描述</span>
                                    <p className="text-[12px] text-slate-600 leading-relaxed">
                                        {lead.needs || <span className="text-slate-400 italic">无详细描述</span>}
                                    </p>
                                </div>

                                {/* Notes */}
                                {lead.notes && (
                                    <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                            <MessageSquare size={10} />
                                            跟进记录
                                        </span>
                                        <p className="text-[12px] text-amber-800/80 leading-relaxed">
                                            {lead.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Edit Form - Inline */}
                                {editingId === lead.id && (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 animate-in fade-in zoom-in-95">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">更新状态</label>
                                                <select
                                                    value={editStatus}
                                                    onChange={(e) => setEditStatus(e.target.value)}
                                                    className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                        <option key={k} value={k}>{v}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">添加备注</label>
                                                <textarea
                                                    value={editNotes}
                                                    onChange={(e) => setEditNotes(e.target.value)}
                                                    className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg h-[42px] resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                                                    placeholder="填写跟进情况..."
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-[12px] font-black hover:bg-slate-50 transition-colors"
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(lead.id)}
                                                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-[12px] font-black hover:bg-violet-700 transition-colors"
                                            >
                                                保存
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {leads.length === 0 && (
                        <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
                            <ClipboardList size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                            <p className="font-bold text-slate-400">暂无销售线索</p>
                            <p className="text-slate-300 text-sm mt-1">在这里管理所有来自企业版咨询的客户意向</p>
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

            {/* 删除确认对话框 */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="确认删除"
                message={`确定要删除线索「${deleteDialog.leadName}」吗？此操作不可恢复。`}
                onConfirm={confirmDelete}
                onCancel={closeDeleteDialog}
                type="danger"
                confirmText="删除"
                cancelText="取消"
            />

            {/* 标记已联系确认对话框 */}
            <ConfirmDialog
                isOpen={contactDialog.isOpen}
                title="确认标记"
                message={`确定将线索「${contactDialog.leadName}」标记为"已联系"吗？`}
                onConfirm={confirmMarkContacted}
                onCancel={closeContactDialog}
                type="info"
                confirmText="确认标记"
                cancelText="取消"
            />

            {/* 线索详情抽屉 */}
            <LeadDetailDrawer
                lead={selectedLead}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onExpand={() => {
                    console.log('展开全页:', selectedLead?.name);
                    // TODO: 实现路由跳转到详情页
                }}
                onEdit={(lead) => {
                    setIsDetailOpen(false);
                    openEdit(lead);
                }}
                onDelete={(id, name) => {
                    setIsDetailOpen(false);
                    handleDelete(id, name);
                }}
                onMarkContacted={(lead) => {
                    setIsDetailOpen(false);
                    handleMarkContactedClick(lead);
                }}
            />
        </div>
    );
};
