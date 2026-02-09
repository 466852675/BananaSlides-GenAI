
// src/components/admin/LeadManagement.tsx
// 销售线索管理页面

import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    RefreshCcw,
    Phone,
    Mail,
    Briefcase,
    Building2,
    CheckCircle2,
    Clock,
    MessageSquare,
    Trash2,
    ClipboardList,
    X
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
// @ts-ignore
import { toast } from 'react-hot-toast';
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
    const [selectedLead, setSelectedLead] = useState<AdminAPI.Lead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

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

    useEffect(() => {
        debouncedFetchLeads();
    }, [keyword, debouncedFetchLeads]);

    const clearSearch = () => {
        setKeyword('');
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
            console.error('Delete lead failed:', error);
        }
    };

    const closeDeleteDialog = () => {
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleStatusUpdate = async (lead: AdminAPI.Lead, status: string) => {
        try {
            await AdminAPI.updateLeadStatus(lead.id, status, '');
            toast.success(`状态已更新为: ${status}`);
            fetchLeads();
            if (selectedLead?.id === lead.id) {
                // 如果当前选中的是这个线索，关闭详情页或刷新（这里选择让用户手动刷新或重新加载详情）
                setIsDetailOpen(false);
            }
        } catch (error) {
            console.error('Update status failed:', error);
            toast.error('操作失败');
        }
    };

    const openDetail = (lead: AdminAPI.Lead) => {
        setSelectedLead(lead);
        setIsDetailOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
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

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-sm flex flex-wrap items-center gap-4">
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
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all ${statusFilter === '' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        全部状态
                    </button>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all ${statusFilter === key ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => fetchLeads()}
                    className="p-3 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                >
                    <RefreshCcw size={18} />
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {leads.map((lead) => (
                        <div key={lead.id} className="group relative bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                            {/* Hover Actions */}
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-slate-100 z-20">
                                <PermissionTooltip requiredPermission="admin.leads.manage.note">
                                    <button onClick={() => openDetail(lead)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="查看详情与跟进">
                                        <MessageSquare size={16} />
                                    </button>
                                </PermissionTooltip>
                                {lead.status === 'PENDING' && (
                                    <PermissionTooltip requiredPermission="admin.leads.manage.status">
                                        <button onClick={() => handleStatusUpdate(lead, 'CONTACTED')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="标记已联系">
                                            <CheckCircle2 size={16} />
                                        </button>
                                    </PermissionTooltip>
                                )}
                                <PermissionTooltip requiredPermission="admin.leads.delete">
                                    <button onClick={() => handleDelete(lead.id, lead.name)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="删除">
                                        <Trash2 size={16} />
                                    </button>
                                </PermissionTooltip>
                            </div>

                            <div className="flex flex-col gap-4 flex-1">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-bold text-base shrink-0 border border-violet-200/50">
                                            {lead.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <h3 className="text-[15px] font-black text-slate-800 truncate">{lead.name}</h3>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold shrink-0 ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}>
                                                        {STATUS_LABELS[lead.status] || lead.status}
                                                    </span>
                                                </div>
                                                {lead.priority === 'HIGH' && (
                                                    <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-rose-50 text-rose-500 border border-rose-100 shrink-0">HIGH</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Clock size={11} />
                                                    {format(new Date(lead.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                                                </div>
                                                {lead.source && <span className="text-slate-200">|</span>}
                                                {lead.source && <span className="truncate max-w-[80px]" title={lead.source}>{lead.source}</span>}

                                                {lead.assignee && (
                                                    <div className="flex items-center gap-1 ml-auto shrink-0 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100">
                                                        <div className="w-3 h-3 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-500 overflow-hidden">{lead.assignee.nickname.charAt(0)}</div>
                                                        <span className="text-[9px] font-medium text-slate-500 max-w-[40px] truncate">{lead.assignee.nickname}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 my-1 bg-slate-50/50 rounded-lg p-3 border border-slate-100/50">
                                        <div className="flex items-center gap-2 text-[12px] text-slate-600 min-w-0">
                                            <Building2 size={13} className="text-slate-400 shrink-0" />
                                            <div className="truncate flex items-center gap-1 min-w-0">
                                                <span className="font-bold truncate" title={lead.company}>{lead.company || '-'}</span>
                                                {lead.position && <span className="text-slate-400 shrink-0 text-[11px]">({lead.position})</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-slate-600 min-w-0">
                                            <Phone size={13} className="text-slate-400 shrink-0" />
                                            <span className="font-mono truncate select-all">{lead.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-slate-600 min-w-0">
                                            <Briefcase size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate" title={`${lead.industry || '未知'} · ${lead.teamSize || '-'}`}>{lead.industry || '未知'} · {lead.teamSize || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-slate-600 min-w-0">
                                            <Mail size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate select-all" title={lead.email}>{lead.email || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 mt-auto min-h-[100px] flex flex-col justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 text-left">需求描述</span>
                                    <p className="text-[12px] text-slate-600 leading-relaxed text-left line-clamp-3">
                                        {lead.needs || <span className="text-slate-400 italic">无详细描述</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {leads.length === 0 && (
                        <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200 col-span-full">
                            <ClipboardList size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                            <p className="font-bold text-slate-400">暂无销售线索</p>
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

            {/* Dialogs */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="确认删除"
                message={`确定要删除线索「${deleteDialog.leadName}」吗？`}
                onConfirm={confirmDelete}
                onCancel={closeDeleteDialog}
                type="danger"
            />


            {/* Detail Drawer */}
            <LeadDetailDrawer
                lead={selectedLead}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onDelete={(id, name) => {
                    setIsDetailOpen(false);
                    handleDelete(id, name);
                }}
                onStatusUpdate={(lead, status) => {
                    handleStatusUpdate(lead, status);
                }}
            />
        </div>
    );
};
