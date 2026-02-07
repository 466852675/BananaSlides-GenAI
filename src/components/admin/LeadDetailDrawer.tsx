import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { User, Phone, Mail, Briefcase, Building2, Clock, X, MessageSquare, CheckCircle2, Trash2, ChevronRight, Calendar, Tag, FileText, Star } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { PermissionTooltip } from '../PermissionTooltip';

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

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !lead) return null;

    const handleAddNote = () => {
        if (newNote.trim()) {
            // TODO: 调用API添加跟进记录
            setNewNote('');
            setIsAddingNote(false);
        }
    };

    if (!isOpen || !lead) return null;

    const drawerContent = (
        <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-xl bg-slate-50 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">线索详情报告</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Lead detail & tracking</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${lead.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                        lead.status === 'QUALIFIED' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                            lead.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                    {lead.status === 'PENDING' ? '待处理' :
                                        lead.status === 'CONTACTED' ? '已跟进' :
                                            lead.status === 'QUALIFIED' ? '高意向' :
                                                lead.status === 'CONVERTED' ? '已成交' : '已关闭'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onExpand}
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                            title="展开详情"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Customer Profile Card */}
                    <div className="p-8">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden mb-8">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                            <div className="relative z-10">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-black tracking-tight">{lead.name}</h2>
                                            <p className="text-slate-400 font-bold text-sm flex items-center gap-2">
                                                <Briefcase size={14} />
                                                {lead.company || '个人客户'} {lead.position && <span className="opacity-50">· {lead.position}</span>}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                                                ))}
                                                <Star size={14} className="text-slate-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">High Intent</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-center min-w-[100px]">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Success Rate</div>
                                        <div className="text-2xl font-black text-emerald-400">70%</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                            <Phone size={14} className="text-slate-300" />
                                        </div>
                                        <span className="text-sm font-bold font-mono tracking-tight">{lead.phone}</span>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                            <Mail size={14} className="text-slate-300" />
                                        </div>
                                        <span className="text-sm font-bold truncate opacity-80">{lead.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200 flex mb-8">
                            {[
                                { id: 'timeline', label: '跟进记录', icon: MessageSquare },
                                { id: 'info', label: '客户详情', icon: Tag },
                                { id: 'files', label: '文件附件', icon: FileText }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === tab.id
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <tab.icon size={14} />
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
                                            className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                                        >
                                            <MessageSquare size={14} />
                                            Add follow-up record
                                        </button>
                                    ) : (
                                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4 animate-in zoom-in-95 duration-300">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Enter follow-up details..."
                                                className="w-full p-4 text-sm bg-slate-50 border border-slate-100 rounded-2xl resize-none h-32 focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 outline-none font-medium"
                                            />
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex gap-2">
                                                    <select className="px-3 py-2 text-xs font-black bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-violet-300">
                                                        <option value="phone">📞 Phone</option>
                                                        <option value="email">📧 Email</option>
                                                        <option value="meeting">🤝 Meeting</option>
                                                        <option value="note">📝 Note</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setIsAddingNote(false)}
                                                        className="px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        CANCEL
                                                    </button>
                                                    <button
                                                        onClick={handleAddNote}
                                                        className="px-6 py-2 bg-violet-600 text-white rounded-xl text-xs font-black hover:bg-violet-700 transition-all shadow-md shadow-violet-200"
                                                    >
                                                        SAVE RECORD
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timeline Items */}
                                    <div className="relative space-y-8 pl-4">
                                        <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-slate-200"></div>

                                        {MOCK_FOLLOW_UPS.map((record, index) => {
                                            const config = TYPE_CONFIG[record.type];
                                            return (
                                                <div key={record.id} className="relative pl-10">
                                                    <div className={`absolute left-0 w-10 h-10 rounded-2xl ${config.bgColor} flex items-center justify-center text-lg border-2 border-white shadow-sm z-10`}>
                                                        {config.icon}
                                                    </div>
                                                    <div className="bg-white rounded-3xl p-6 border border-slate-100 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${config.bgColor} ${config.textColor}`}>
                                                                    {config.label}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-300">•</span>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                                                </span>
                                                            </div>
                                                            {record.duration && (
                                                                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    <Clock size={10} />
                                                                    {record.duration}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                            {record.content}
                                                        </p>
                                                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                                    {record.createdBy.charAt(0)}
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">BY {record.createdBy}</span>
                                                            </div>
                                                            {record.nextFollowUp && (
                                                                <div className="flex items-center gap-2 px-3 py-1 bg-violet-50 rounded-full">
                                                                    <Calendar size={10} className="text-violet-500" />
                                                                    <span className="text-[10px] font-black text-violet-600 tracking-wider">NEXT: {record.nextFollowUp}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <div className="space-y-6 pb-20">
                                    <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                                                <Tag size={16} />
                                            </div>
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">标签与特征 (Attributes)</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['企业客户', 'VIP', '私有化部署'].map(tag => (
                                                <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-black border border-slate-200">
                                                    {tag}
                                                </span>
                                            ))}
                                            <button className="px-3 py-1.5 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-xs font-black hover:border-violet-300 hover:text-violet-600 transition-all">
                                                + NEW TAG
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-4 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                                <FileText size={16} />
                                            </div>
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">核心需求描述 (Description)</h4>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-700 font-medium leading-relaxed border border-slate-100">
                                            {lead.needs || '暂无详细描述...'}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                                <Star size={16} />
                                            </div>
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">商机价值预测 (Value Analysis)</h4>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">成交概率</span>
                                                    <span className="text-sm font-black text-emerald-600">70%</span>
                                                </div>
                                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-sm shadow-emerald-200" style={{ width: '70%' }}></div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">预计金额</div>
                                                    <div className="text-lg font-black text-slate-800 tracking-tight">¥50,000/年</div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">预计成交</div>
                                                    <div className="text-lg font-black text-slate-800 tracking-tight">2026-03-15</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="space-y-3 pb-20">
                                    {['产品手册_v2.pdf', '部署方案.pdf', '报价单_2026Q1.xlsx', '合同模板.docx'].map((file, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-[1.5rem] hover:shadow-md transition-all cursor-pointer group">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl group-hover:bg-violet-50 transition-colors">
                                                {file.endsWith('.pdf') ? '📕' : file.endsWith('.xlsx') ? '📗' : '📘'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-black text-slate-800 truncate tracking-tight">{file}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">2.3 MB · TODAY 14:30</div>
                                            </div>
                                            <button className="px-4 py-1.5 bg-slate-50 text-[10px] font-black text-slate-600 rounded-lg border border-slate-200 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all tracking-widest uppercase">
                                                DOWNLOAD
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer - Sticky Actions */}
                <div className="px-8 py-6 border-t border-slate-100 bg-white/80 backdrop-blur-xl flex items-center gap-3 shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] sticky bottom-0 z-10 rounded-t-[2.5rem]">
                    <PermissionTooltip requiredPermission="admin.leads.manage.note">
                        <button
                            onClick={() => onEdit?.(lead)}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-blue-50 hover:text-blue-600 transition-all flex flex-col items-center gap-1.5"
                        >
                            <MessageSquare size={16} />
                            记跟进
                        </button>
                    </PermissionTooltip>

                    {lead.status === 'PENDING' && (
                        <PermissionTooltip requiredPermission="admin.leads.manage.status">
                            <button
                                onClick={() => onMarkContacted?.(lead)}
                                className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:shadow-xl hover:shadow-emerald-500/25 transition-all flex flex-col items-center gap-1.5"
                            >
                                <CheckCircle2 size={16} strokeWidth={3} />
                                标记为已成功联络
                            </button>
                        </PermissionTooltip>
                    )}

                    <button className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-violet-50 hover:text-violet-600 transition-all flex flex-col items-center gap-1.5">
                        <Mail size={16} />
                        发邮件
                    </button>

                    <PermissionTooltip requiredPermission="admin.leads.delete">
                        <button
                            onClick={() => onDelete?.(lead.id, lead.name)}
                            className="p-4 bg-rose-50 text-rose-500 rounded-2xl font-black hover:bg-rose-100 transition-all"
                        >
                            <Trash2 size={20} />
                        </button>
                    </PermissionTooltip>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(drawerContent, document.body);
};

export default LeadDetailDrawer;
