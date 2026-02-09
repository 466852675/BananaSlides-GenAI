// src/components/message/MessageItem.tsx
// 单条消息组件

import React from 'react';
import {
    Bell,
    ShoppingBag,
    DollarSign,
    Bot,
    Star,
    Crown,
    Gift,
    Shield,
    ChevronRight
} from 'lucide-react';
import type { Message, MessageType } from '../../api/message';

interface MessageItemProps {
    message: Message;
    onClick?: (message: Message) => void;
}

// 消息类型配置
const MESSAGE_TYPE_CONFIG: Record<MessageType, { icon: React.ReactNode; label: string; style: string }> = {
    SYSTEM: { icon: <Bell size={14} />, label: '系统', style: 'bg-slate-100 text-slate-600' },
    ORDER: { icon: <ShoppingBag size={14} />, label: '订单', style: 'bg-emerald-100 text-emerald-600' },
    REFUND: { icon: <DollarSign size={14} />, label: '退款', style: 'bg-amber-100 text-amber-600' },
    AI: { icon: <Bot size={14} />, label: 'AI', style: 'bg-violet-100 text-violet-600' },
    POINTS: { icon: <Star size={14} />, label: '积分', style: 'bg-yellow-100 text-yellow-600' },
    VIP: { icon: <Crown size={14} />, label: 'VIP', style: 'bg-rose-100 text-rose-600' },
    ACTIVITY: { icon: <Gift size={14} />, label: '活动', style: 'bg-pink-100 text-pink-600' },
    SECURITY: { icon: <Shield size={14} />, label: '安全', style: 'bg-red-100 text-red-600' },
};

// 时间格式化
function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onClick }) => {
    const config = MESSAGE_TYPE_CONFIG[message.type] || MESSAGE_TYPE_CONFIG.SYSTEM;

    return (
        <div
            className={`
                group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
                ${message.isRead
                    ? 'bg-white hover:bg-slate-50'
                    : 'bg-violet-50/50 hover:bg-violet-50'
                }
            `}
            onClick={() => onClick?.(message)}
        >
            {/* 未读指示器 */}
            {!message.isRead && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-500" />
            )}

            {/* 类型图标 */}
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config.style}`}>
                {config.icon}
            </div>

            {/* 内容区 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {message.isImportant && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">
                            重要
                        </span>
                    )}
                    <h4 className={`text-sm font-bold truncate ${message.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                        {message.title}
                    </h4>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {message.summary || message.content}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                    {formatTime(message.createdAt)}
                </p>
            </div>

            {/* 箭头 */}
            {message.actionUrl && (
                <ChevronRight
                    size={16}
                    className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors"
                />
            )}
        </div>
    );
};

export default MessageItem;
