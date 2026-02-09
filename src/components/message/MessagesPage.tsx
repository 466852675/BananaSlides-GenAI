// src/components/message/MessagesPage.tsx
// 消息列表独立页面

import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Inbox, ArrowLeft, Trash2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessages, useMarkAsRead, useMarkAllAsRead, useDeleteMessage } from '../../hooks/useMessages';
import { MessageItem } from './MessageItem';
import type { Message, MessageType } from '../../api/message';

// 分类Tab配置
const TABS: { key: MessageType | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'ORDER', label: '订单' },
    { key: 'VIP', label: '会员' },
    { key: 'AI', label: 'AI' },
    { key: 'SYSTEM', label: '系统' },
    { key: 'REFUND', label: '退款' },
];

import { MessageSettingsModal } from './MessageSettingsModal';

export const MessagesPage: React.FC = () => {
    // const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<MessageType | 'all'>('all');
    const [page, setPage] = useState(1);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // 数据查询
    const { data: messagesData, isLoading, isFetching } = useMessages({
        page,
        limit: 20,
        type: activeTab === 'all' ? undefined : activeTab,
    });

    // ... (keep existing hooks)
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const deleteMessage = useDeleteMessage();

    const messages = messagesData?.items || [];
    const pagination = messagesData?.pagination;

    // ... (keep handlers)
    const handleMessageClick = async (message: Message) => {
        if (!message.isRead) {
            await markAsRead.mutateAsync(message.id);
        }
        if (message.actionUrl) {
            window.location.href = message.actionUrl;
        }
    };

    const handleDelete = (messageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteMessage.mutate(messageId);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* 头部 */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.history.back()}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-2">
                                <Bell size={20} className="text-violet-600" />
                                <h1 className="text-lg font-bold">消息中心</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                title="通知设置"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                onClick={() => markAllAsRead.mutate()}
                                disabled={markAllAsRead.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            >
                                {markAllAsRead.isPending ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <CheckCheck size={14} />
                                )}
                                全部已读
                            </button>
                        </div>
                    </div>

                    {/* 分类Tab */}
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setPage(1);
                                }}
                                className={`
                                    px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
                                    ${activeTab === tab.key
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'text-slate-500 hover:bg-slate-100'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 消息列表 */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-violet-500" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Inbox size={48} strokeWidth={1.5} />
                        <p className="mt-3 text-sm">暂无消息</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="relative group"
                            >
                                <MessageItem
                                    message={message}
                                    onClick={handleMessageClick}
                                />
                                <button
                                    onClick={(e) => handleDelete(message.id, e)}
                                    className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                    title="删除消息"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* 分页 */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            上一页
                        </button>
                        <span className="text-sm text-slate-500">
                            {page} / {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages || isFetching}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            下一页
                        </button>
                    </div>
                )}
            </div>

            <MessageSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default MessagesPage;
