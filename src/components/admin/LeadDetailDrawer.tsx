import React, { useState } from 'react';
import { User, Phone, Mail, Briefcase, Clock, MessageSquare, CheckCircle2, Trash2, ChevronRight, Calendar, Tag, FileText, Star, ShoppingBag, Fingerprint, Activity, DollarSign, Globe, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { PermissionTooltip } from '../PermissionTooltip';
import { AdminDrawer } from './shared';
// @ts-ignore
import { toast } from 'react-hot-toast';

interface Lead {
    id: string;
    name: string;
    company: string;
    position: string;
    phone: string;
    email?: string;
    industry?: string;
    teamSize?: string;
    status: string;
    needs?: string;
    notes?: string;
    createdAt: string;
    source?: string;
    convertedOrderId?: string;
    convertedAt?: string;
}

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
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onExpand?: () => void;
    onEdit?: (lead: Lead) => void;
    onDelete?: (id: string, name: string) => void;
    onMarkContacted?: (lead: Lead) => void;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; bgColor: string; textColor: string }> = {
    phone: { icon: '📞', label: '电话沟通', bgColor: 'bg-violet-50', textColor: 'text-violet-600' },
    email: { icon: '📧', label: '发送邮件', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    meeting: { icon: '🤝', label: '线下会面', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    note: { icon: '📝', label: '备注记录', bgColor: 'bg-slate-50', textColor: 'text-slate-600' }
};

const MOCK_FOLLOW_UPS: FollowUpRecord[] = [
    {
        id: '1',
        type: 'phone',
        content: '客户对私有化部署方案很感兴趣，但对价格有疑虑。需要申请集团折扣，预计可以给到8折。客户表示需要内部讨论后回复。',
        createdAt: new Date().toISOString(),
        createdBy: '小王',
        duration: '15分钟',
        nextFollowUp: '明天 10:00'
    },
    {
        id: '2',
        type: 'email',
        content: '发送产品手册和私有化部署方案，包含客户案例和定价说明。',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: '小李',
        attachments: ['产品手册_v2.pdf', '部署方案.pdf']
    },
    {
        id: '3',
        type: 'note',
        content: '客户通过官网表单咨询，需求：企业账号批量采购、API对接、私有化部署方案。',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        createdBy: '系统'
    }
];

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
    lead,
    isOpen,
    onClose,
    onExpand,
    onEdit,
    onDelete,
    onMarkContacted
}) => {
    const [activeTab, setActiveTab] = useState<'timeline' | 'info' | 'files'>('timeline');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState('');

    const handleAddNote = () => {
        if (newNote.trim()) {
            setNewNote('');
            setIsAddingNote(false);
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
            width="wide"
            headerExtra={
                <button
                    onClick={onExpand}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all"
                    title="展开完整视图"
                >
                    <ChevronRight size={20} />
                </button>
            }
            footer={
                <div className="flex items-center gap-3 w-full">
                    <PermissionTooltip requiredPermission="admin.leads.manage.note" className="flex-1">
                        <button
                            onClick={() => onEdit?.(lead)}
                            className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <MessageSquare size={16} />
                            记跟进
                        </button>
                    </PermissionTooltip>

                    {lead.status === 'PENDING' && (
                        <PermissionTooltip requiredPermission="admin.leads.manage.status" className="flex-[2]">
                            <button
                                onClick={() => onMarkContacted?.(lead)}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase hover:shadow-xl hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} strokeWidth={3} />
                                标记为已成功联络
                            </button>
                        </PermissionTooltip>
                    )}

                    <PermissionTooltip requiredPermission="admin.leads.delete">
                        <button
                            onClick={() => onDelete?.(lead.id, lead.name)}
                            className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="删除线索"
                        >
                            <Trash2 size={20} />
                        </button>
                    </PermissionTooltip>
                </div>
            }
        >
            {/* Header: Identity Card */}
            <AdminDrawer.HeadCard
                title={lead.name}
                description={lead.company || '个人客户'}
                icon={User}
                variant="dark"
            >
                <div className="flex flex-wrap gap-3 mt-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3 flex-1 min-w-[140px]">
                        <Phone size={14} className="text-slate-300" />
                        <span className="text-xs font-bold font-mono text-white/90">{lead.phone}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3 flex-1 min-w-[140px]">
                        <Mail size={14} className="text-slate-300" />
                        <span className="text-xs font-bold truncate text-white/90">{lead.email || 'N/A'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-6">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${lead.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        lead.status === 'CONTACTED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            lead.status === 'CONVERTED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                        {lead.status === 'PENDING' ? '待处理' :
                            lead.status === 'CONTACTED' ? '已跟进' :
                                lead.status === 'CONVERTED' ? '已转单' : '已关闭'}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map(i => <Star key={i} size={10} className="text-amber-400 fill-amber-400" />)}
                        <Star size={10} className="text-white/20" />
                    </div>
                </div>
            </AdminDrawer.HeadCard>

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
                        {!isAddingNote ? (
                            <button
                                onClick={() => setIsAddingNote(true)}
                                className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={14} />
                                Add follow-up record
                            </button>
                        ) : (
                            <AdminDrawer.Card className="animate-in zoom-in-95 duration-300">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Enter follow-up details..."
                                    className="w-full text-sm bg-slate-50 border border-slate-100 rounded-2xl p-4 min-h-[100px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none font-medium"
                                />
                                <div className="flex items-center justify-between mt-4">
                                    <select className="pl-3 pr-8 py-2 text-[10px] font-black bg-slate-50 border border-slate-100 rounded-xl outline-none appearance-none cursor-pointer tracking-widest uppercase">
                                        <option value="phone">📞 Phone</option>
                                        <option value="email">📧 Email</option>
                                        <option value="meeting">🤝 Meeting</option>
                                        <option value="note">📝 Note</option>
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
                        <AdminDrawer.Section title="最近动态 (Activities)" icon={Clock}>
                            <div className="relative space-y-4 pl-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {MOCK_FOLLOW_UPS.map((record) => {
                                    const config = TYPE_CONFIG[record.type];
                                    return (
                                        <AdminDrawer.Card key={record.id} className="relative group hover:border-indigo-100 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
                                                        {config.label}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-300">
                                                        {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                                    </span>
                                                </div>
                                                {record.duration && (
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock size={10} /> {record.duration}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-bold">
                                                {record.content}
                                            </p>
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                                        {record.createdBy.charAt(0)}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BY {record.createdBy}</span>
                                                </div>
                                                {record.nextFollowUp && (
                                                    <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded flex items-center gap-1.5 border border-indigo-100">
                                                        <Calendar size={10} />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">Next: {record.nextFollowUp}</span>
                                                    </div>
                                                )}
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
        </AdminDrawer>
    );
};

export default LeadDetailDrawer;
