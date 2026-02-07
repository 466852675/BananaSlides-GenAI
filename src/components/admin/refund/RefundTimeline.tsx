import React from 'react';
import { Clock, CheckCircle, XCircle, User, Shield, RefreshCcw } from 'lucide-react';
import type { RefundAuditItem } from '@/api/refund';

interface RefundTimelineProps {
    history: RefundAuditItem[];
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
    SUBMIT: { 
        icon: <Clock size={14} />, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        label: '用户提交申请'
    },
    AUTO_APPROVE: { 
        icon: <Shield size={14} />, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-50',
        label: '系统自动通过'
    },
    APPROVE: { 
        icon: <CheckCircle size={14} />, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-50',
        label: '管理员同意'
    },
    REJECT: { 
        icon: <XCircle size={14} />, 
        color: 'text-rose-600', 
        bgColor: 'bg-rose-50',
        label: '管理员拒绝'
    },
    PROCESS: { 
        icon: <RefreshCcw size={14} />, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        label: '处理中'
    },
    COMPLETE: { 
        icon: <CheckCircle size={14} />, 
        color: 'text-violet-600', 
        bgColor: 'bg-violet-50',
        label: '退款完成'
    },
    FAIL: { 
        icon: <XCircle size={14} />, 
        color: 'text-rose-600', 
        bgColor: 'bg-rose-50',
        label: '退款失败'
    },
};

export const RefundTimeline: React.FC<RefundTimelineProps> = ({ history }) => {
    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-violet-500" />
                审核流程
            </h3>

            {history.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
暂无审核记录
                </div>
            ) : (
                <div className="space-y-0">
                    {history.map((item, index) => {
                        const config = actionConfig[item.action] || actionConfig.SUBMIT;
                        const isLast = index === history.length - 1;
                        const isSystem = item.operator === 'system';
                        
                        return (
                            <div key={item.id} className="flex gap-3">
                                {/* 节点 */}
                                <div className="relative flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor} ${config.color} z-10`}>
                                        {config.icon}
                                    </div>
                                    {!isLast && (
                                        <div className="absolute top-8 bottom-[-20px] w-0.5 bg-slate-100" />
                                    )}
                                </div>
                                
                                {/* 内容 */}
                                <div className="flex-1 pb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-700">{config.label}</span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                                        </span>
                                    </div>
                                    
                                    {/* 操作人 */}
                                    <div className="flex items-center gap-1 mt-1">
                                        {isSystem ? (
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Shield size={10} /> 系统自动
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <User size={10} /> {item.operator}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* 备注 */}
                                    {item.note && (
                                        <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                                            {item.note}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
