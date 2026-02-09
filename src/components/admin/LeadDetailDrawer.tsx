import React, { useState, useRef, useEffect } from 'react';
import { User, Phone, Mail, Briefcase, Clock, MessageSquare, CheckCircle2, XCircle, Trash2, ChevronRight, Calendar, Tag, FileText, Star, ShoppingBag, Fingerprint, Activity, DollarSign, Globe, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { PermissionTooltip } from '../PermissionTooltip';
import { AdminDrawer } from './shared';
import * as AdminAPI from '../../api/admin';
// @ts-ignore
import { toast } from 'react-hot-toast';

interface FollowUpRecord {
    id: string;
    type: 'phone' | 'email' | 'meeting' | 'note';
    content: string;
    createdAt: string;
    createdBy: string;
    duration?: string;
    nextFollowUp?: string;
    attachments?: string[];
}

interface LeadDetailDrawerProps {
    lead: AdminAPI.Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onExpand?: () => void;
    onDelete?: (id, name: string) => void;
    onStatusUpdate?: (lead: AdminAPI.Lead, status: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; bgColor: string; textColor: string }> = {
    CALL: { icon: '📞', label: '电话沟通', bgColor: 'bg-violet-50', textColor: 'text-violet-600' },
    EMAIL: { icon: '📧', label: '发送邮件', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    MEETING: { icon: '🤝', label: '线下会面', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    NOTE: { icon: '📝', label: '备注记录', bgColor: 'bg-slate-50', textColor: 'text-slate-600' },
    SYSTEM: { icon: '⚙️', label: '系统日志', bgColor: 'bg-amber-50', textColor: 'text-amber-600' }
};

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
    lead,
    isOpen,
    onClose,
    onExpand,
    onDelete,
    onStatusUpdate
}) => {
    const [activeTab, setActiveTab] = useState<'timeline' | 'info' | 'files'>('timeline');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState<string>('NOTE');
    const [activities, setActivities] = useState<AdminAPI.LeadActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);

    // 加载动态
    useEffect(() => {
        if (isOpen && lead?.id) {
            loadActivities();
        }
    }, [isOpen, lead?.id]);

    // 自动聚焦输入框
    useEffect(() => {
        if (isAddingNote && noteInputRef.current) {
            noteInputRef.current.focus();
        }
    }, [isAddingNote]);

    const loadActivities = async () => {
        if (!lead?.id) return;
        setLoadingActivities(true);
        try {
            const data = await AdminAPI.getLeadActivities(lead.id);
            setActivities(data);
        } catch (error) {
            console.error('Load activities error:', error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const startAddNote = () => {
        setActiveTab('timeline');
        setIsAddingNote(true);
    };

    const handleAddNote = async () => {
        if (!lead?.id || !newNote.trim()) return;

        try {
            await AdminAPI.createLeadActivity(lead.id, {
                type: noteType,
                content: newNote.trim()
            });
            toast.success('记录已添加');
            setNewNote('');
            setIsAddingNote(false);
            loadActivities(); // 刷新列表
        } catch (error: any) {
            toast.error(error.message || '添加记录失败');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label}已复制`);
    };

    if (!lead) return null;

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title="线索详情报告"
            description="View full lead engagement & context"
            width="narrow"

            footer={
                <div className="flex items-center gap-2 w-full">
                    {/* Delete Action (Danger) */}
                    {['PENDING', 'CONTACTED', 'QUALIFIED'].includes(lead.status) && (
                        <PermissionTooltip requiredPermission="admin.leads.delete">
                            <button
                                onClick={() => onDelete?.(lead.id, lead.name)}
                                className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                                title="删除线索"
                            >
                                <Trash2 size={18} />
                            </button>
                        </PermissionTooltip>
                    )}

                    {/* Close Action (Secondary) */}
                    {lead.status !== 'CLOSED' && lead.status !== 'CONVERTED' && (
                        <PermissionTooltip requiredPermission="admin.leads.manage.status">
                            <button
                                onClick={() => onStatusUpdate?.(lead, 'CLOSED')}
                                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                                title="关闭线索"
                            >
                                <XCircle size={18} />
                            </button>
                        </PermissionTooltip>
                    )}

                    {/* Log Note Action (Primary/Secondary) */}
                    {['PENDING', 'CONTACTED', 'QUALIFIED'].includes(lead.status) && (
                        <PermissionTooltip requiredPermission="admin.leads.manage.note" className="flex-1">
                            <button
                                onClick={startAddNote}
                                className="w-full py-3 bg-violet-50 text-violet-600 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-violet-100 transition-all flex items-center justify-center gap-2 border border-violet-100/50"
                            >
                                <MessageSquare size={16} />
                                记跟进
                            </button>
                        </PermissionTooltip>
                    )}

                    {/* Qualify Action (Primary) */}
                    {(lead.status === 'PENDING' || lead.status === 'CONTACTED') && (
                        <PermissionTooltip requiredPermission="admin.leads.manage.status" className="flex-1">
                            <button
                                onClick={() => onStatusUpdate?.(lead, 'QUALIFIED')}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase hover:shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} strokeWidth={3} />
                                确定高意向
                            </button>
                        </PermissionTooltip>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                <AdminDrawer.HeadCard
                    title={lead.name || 'Unknown Lead'}
                    description={lead.company || lead.email || 'No company info'}
                    avatarFallback={lead.name || lead.email || 'Lead'}
                    variant="info"
                >
                    <div className="flex flex-wrap gap-2 mt-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${lead.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                lead.status === 'QUALIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                    lead.status === 'CONVERTED' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                        'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                            {lead.status}
                        </span>
                        {lead.source && (
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/50 text-slate-500 border border-slate-200 uppercase flex items-center gap-1">
                                <Globe size={10} /> {lead.source}
                            </span>
                        )}
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/50 text-slate-500 border border-slate-200 uppercase flex items-center gap-1">
                            <Star size={10} className={lead.score >= 80 ? "text-amber-500 fill-amber-500" : "text-slate-300"} />
                            Score: {lead.score}
                        </span>
                    </div>
                </AdminDrawer.HeadCard>


            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200 flex sticky top-0 z-20">
                {[
                    { id: 'timeline', label: '跟进记录', icon: MessageSquare },
                    { id: 'info', label: '客户详情', icon: Tag },
                    { id: 'files', label: '文件附件', icon: FileText }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === tab.id
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                    >
                        <tab.icon size={12} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'timeline' && (
                    <div className="space-y-6">
                        {/* Quick Note Input */}
                        {isAddingNote && (
                            <AdminDrawer.Card className="animate-in zoom-in-95 duration-300">
                                <textarea
                                    ref={noteInputRef}
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="输入跟进细节或备注信息..."
                                    className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-4 min-h-[100px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none font-medium"
                                />
                                <div className="flex items-center justify-between mt-4">
                                    <select
                                        value={noteType}
                                        onChange={(e) => setNoteType(e.target.value)}
                                        className="pl-3 pr-8 py-2 text-[10px] font-black bg-slate-50 border border-slate-100 rounded-xl outline-none appearance-none cursor-pointer tracking-widest uppercase"
                                    >
                                        <option value="PHONE">📞 Phone</option>
                                        <option value="EMAIL">📧 Email</option>
                                        <option value="MEETING">🤝 Meeting</option>
                                        <option value="NOTE">📝 Note</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsAddingNote(false)}
                                            className="px-4 py-2 text-[10px] font-black text-slate-400 hover:text-slate-600"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            onClick={handleAddNote}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all"
                                        >
                                            SAVE RECORD
                                        </button>
                                    </div>
                                </div>
                            </AdminDrawer.Card>
                        )}

                        {/* Timeline Items */}
                        <AdminDrawer.Section title="动态追踪 (Live Activities)" icon={Activity}>
                            <div className="relative space-y-4 pl-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {loadingActivities ? (
                                    <div className="py-8 text-center text-slate-400 animate-pulse font-black text-[10px] tracking-widest uppercase">
                                        Loading historical records...
                                    </div>
                                ) : activities.length === 0 ? (
                                    <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <div className="text-2xl mb-2">🧊</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No activities recorded yet</div>
                                    </div>
                                ) : activities
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .map((record) => {
                                        const config = TYPE_CONFIG[record.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.NOTE;
                                        return (
                                            <AdminDrawer.Card key={record.id} className="relative group hover:border-indigo-100 transition-colors shadow-sm" noPadding>
                                                <div className="p-4 border-l-4 border-indigo-500/30">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
                                                                {config.label}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-slate-300">
                                                                {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-700 leading-relaxed font-bold">
                                                        {record.content}
                                                    </p>
                                                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                                                A
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                {record.type === 'SYSTEM' ? 'SYSTEM' : 'ADMIN'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AdminDrawer.Card>
                                        );
                                    })}
                            </div>
                        </AdminDrawer.Section>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="space-y-6">
                        <AdminDrawer.Section title="标签与描述 (Tags & Context)" icon={Tag}>
                            <AdminDrawer.Card className="space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {['企业客户', 'VIP', '私有化部署'].map(tag => (
                                        <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black border border-slate-100">
                                            {tag}
                                        </span>
                                    ))}
                                    <button className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black border border-indigo-100">
                                        + ADD
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1.5 tracking-widest">
                                        <FileText size={12} className="text-indigo-500" /> 需求描述
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-bold italic fill-slate-500">
                                        "{lead.needs || '客户暂无详细需求说明...'}"
                                    </p>
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        <AdminDrawer.Section title="价值分析 (Value Matrix)" icon={Fingerprint}>
                            <AdminDrawer.Card className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">成交概率预测</span>
                                        <span className="text-sm font-black text-indigo-600">70%</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style={{ width: '70%' }}></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <AdminDrawer.KeyValue label="预计金额" value="¥5.2W / Year" icon={DollarSign} />
                                    <AdminDrawer.KeyValue label="意向来源" value={lead.source || 'Direct'} icon={Globe} />
                                    <AdminDrawer.KeyValue label="成交节点" value="2026-Q1" icon={Calendar} />
                                    <AdminDrawer.KeyValue label="线索 ID" value={
                                        <span className="font-mono text-[10px] text-slate-400" onClick={() => copyToClipboard(lead.id, '线索ID')}>
                                            {lead.id.substring(0, 8)}...
                                        </span>
                                    } />
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="space-y-3">
                        {['产品手册_v2.pdf', '部署方案.pdf', '报价单_2026Q1.xlsx', '合同草案.docx'].map((file, i) => (
                            <AdminDrawer.Card key={i} className="flex items-center gap-4 hover:border-indigo-200 cursor-pointer group" noPadding>
                                <div className="p-4 flex items-center gap-4 w-full">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl group-hover:bg-indigo-50 transition-colors">
                                        {file.endsWith('.pdf') ? '📕' : file.endsWith('.xlsx') ? '📗' : '📘'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-black text-slate-800 truncate">{file}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">2.4 MB · Today</div>
                                    </div>
                                    <button className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all uppercase tracking-widest">
                                        Get
                                    </button>
                                </div>
                            </AdminDrawer.Card>
                        ))}
                    </div>
                )}
            </div>
        </AdminDrawer >
    );
};

export default LeadDetailDrawer;
