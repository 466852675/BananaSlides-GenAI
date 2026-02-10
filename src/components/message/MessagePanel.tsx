// src/components/message/MessagePanel.tsx
// 消息面板组件

import React, { useState, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2, Inbox, Trash2, X, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMessages, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useMessages';
import { useAuth } from '../../contexts/AuthContext';
import { MessageItem } from './MessageItem';
import { batchDeleteMessages } from '../../api/message';
import type { Message, MessageType } from '../../api/message';

// 普通用户 Tab
const USER_TABS: { key: MessageType | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'ORDER', label: '订单' },
    { key: 'VIP', label: '会员' },
    { key: 'AI', label: 'AI' },
    { key: 'SYSTEM', label: '系统' },
    { key: 'REFUND', label: '退款' },
];

// 管理员 Tab (增加线索、报表等概念)
// 注意：LEAD 是独立的 MessageType，与 SYSTEM 平级
const ADMIN_TABS: { key: string; label: string; type?: MessageType; bizType?: string; excludeBizType?: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'lead', label: '线索', type: 'LEAD' },
    { key: 'order', label: '订单', type: 'ORDER' },
    { key: 'refund', label: '退款', type: 'REFUND' },
    { key: 'system', label: '系统', type: 'SYSTEM' },
    { key: 'ai', label: 'AI', type: 'AI' },
];

interface MessagePanelProps {
    onClose?: () => void;
}

export const MessagePanel: React.FC<MessagePanelProps> = ({ onClose }) => {
    // const navigate = useNavigate();
    const { isAdmin, isSuperAdmin } = useAuth();
    const [activeTabKey, setActiveTabKey] = useState<string>('all');

    // 计算当前可用的 Tabs
    const tabs = useMemo(() => {
        if (isAdmin || isSuperAdmin) {
            return ADMIN_TABS;
        }
        return USER_TABS;
    }, [isAdmin, isSuperAdmin]);

    // 计算查询参数
    const queryParams = useMemo(() => {
        if (activeTabKey === 'all') return { limit: 20 };

        if (isAdmin || isSuperAdmin) {
            const tab = ADMIN_TABS.find(t => t.key === activeTabKey);
            if (tab) {
                return {
                    limit: 20,
                    type: tab.type,
                    bizType: tab.bizType,
                    excludeBizType: tab.excludeBizType
                };
            }
        } else {
            // 普通用户 key 即 type
            return {
                limit: 20,
                type: activeTabKey as MessageType
            };
        }
        return { limit: 20 };
    }, [activeTabKey, isAdmin, isSuperAdmin]);

    // 数据查询
    const { data: unreadData } = useUnreadCount();
    const { data: messagesData, isLoading } = useMessages(queryParams);

    // 操作
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();

    const messages = messagesData?.items || [];
    const unreadCount = unreadData?.total || 0;

    // 批量管理
    const [isManaging, setIsManaging] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const queryClient = useQueryClient();

    const batchDelete = useMutation({
        mutationFn: (ids: string[]) => batchDeleteMessages(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
            setSelectedIds(new Set());
            setIsManaging(false);
        },
    });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === messages.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(messages.map(m => m.id)));
        }
    };

    const handleBatchDelete = () => {
        if (selectedIds.size === 0) return;
        batchDelete.mutate(Array.from(selectedIds));
    };

    // 处理消息点击
    const handleMessageClick = async (message: Message) => {
        // 标记已读
        if (!message.isRead) {
            await markAsRead.mutateAsync(message.id);
        }

        // 跳转（如果有actionUrl）
        if (message.actionUrl) {
            onClose?.();
            window.location.href = message.actionUrl;
        }
    };

    // 全部标记已读
    const handleMarkAllRead = () => {
        markAllAsRead.mutate();
    };

    return (
        <div className="w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* 头部 */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell size={18} />
                        <span className="font-bold">消息中心</span>
                        {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white/20 rounded-full">
                                {unreadCount > 99 ? '99+' : unreadCount}条未读
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isManaging && unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={markAllAsRead.isPending}
                                className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                            >
                                {markAllAsRead.isPending ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <CheckCheck size={12} />
                                )}
                                全部已读
                            </button>
                        )}
                        <button
                            onClick={() => { setIsManaging(!isManaging); setSelectedIds(new Set()); }}
                            className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                        >
                            {isManaging ? <X size={12} /> : <Settings size={12} />}
                            {isManaging ? '取消' : '管理'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 分类Tab */}
            <div className="px-3 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto scrollbar-none">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTabKey(tab.key as string)}
                        className={`
                            px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all flex-shrink-0
                            ${activeTabKey === tab.key
                                ? 'bg-violet-100 text-violet-700'
                                : 'text-slate-500 hover:bg-slate-100'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 消息列表 */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-violet-500" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Inbox size={40} strokeWidth={1.5} />
                        <p className="mt-2 text-sm">暂无消息</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        <AnimatePresence mode="popLayout">
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-start gap-2"
                                >
                                    {isManaging && (
                                        <button
                                            onClick={() => toggleSelect(message.id)}
                                            className={`mt-3 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(message.id)
                                                    ? 'bg-violet-500 border-violet-500 text-white'
                                                    : 'border-slate-300 hover:border-violet-400'
                                                }`}
                                        >
                                            {selectedIds.has(message.id) && <Check size={10} />}
                                        </button>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <MessageItem
                                            message={message}
                                            onClick={isManaging ? () => toggleSelect(message.id) : handleMessageClick}
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* 底部 */}
            {isManaging && messages.length > 0 ? (
                <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={toggleSelectAll}
                        className="text-xs text-slate-500 hover:text-violet-600 font-medium"
                    >
                        {selectedIds.size === messages.length ? '取消全选' : '全选'}
                    </button>
                    <button
                        onClick={handleBatchDelete}
                        disabled={selectedIds.size === 0 || batchDelete.isPending}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {batchDelete.isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Trash2 size={12} />
                        )}
                        删除选中 ({selectedIds.size})
                    </button>
                </div>
            ) : messages.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 text-center">
                    <button
                        onClick={() => {
                            onClose?.();
                            window.location.href = '/messages';
                        }}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                        查看全部消息 →
                    </button>
                </div>
            )}
        </div>
    );
};

export default MessagePanel;
