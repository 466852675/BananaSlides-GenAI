// src/components/message/MessagesPage.tsx
// 消息列表独立页面

import React, { useState, useMemo } from 'react';
import { Bell, CheckCheck, Loader2, Inbox, ArrowLeft, Trash2, Settings, Search, X, CheckSquare, Square, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessages, useMarkAsRead, useMarkAllAsRead, useDeleteMessage, useBatchMarkAsRead, useBatchDeleteMessages, useMarkMessageAsHandled } from '../../hooks/useMessages';
import { useAuth } from '../../contexts/AuthContext';
import { MessageItem } from './MessageItem';
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

// 分类Tab配置


import { MessageSettingsModal } from './MessageSettingsModal';

export const MessagesPage: React.FC = () => {
    const { isAdmin, isSuperAdmin } = useAuth();
    const [activeTabKey, setActiveTabKey] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const tabs = useMemo(() => {
        if (isAdmin || isSuperAdmin) {
            return ADMIN_TABS;
        }
        return USER_TABS;
    }, [isAdmin, isSuperAdmin]);

    const queryParams = useMemo(() => {
        const base = { page, limit: 20, keyword: keyword || undefined };

        if (activeTabKey === 'all') return base;

        if (isAdmin || isSuperAdmin) {
            const tab = ADMIN_TABS.find(t => t.key === activeTabKey);
            if (tab) {
                return {
                    ...base,
                    type: tab.type,
                    bizType: tab.bizType,
                    excludeBizType: tab.excludeBizType
                };
            }
        } else {
            return {
                ...base,
                type: activeTabKey as MessageType
            };
        }
        return base;
    }, [activeTabKey, isAdmin, isSuperAdmin, page, keyword]);

    const { data: messagesData, isLoading, isFetching } = useMessages(queryParams);

    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const deleteMessage = useDeleteMessage();
    const batchMarkAsRead = useBatchMarkAsRead();
    const batchDeleteMessages = useBatchDeleteMessages();
    const markMessageAsHandled = useMarkMessageAsHandled();

    const messages = messagesData?.items || [];
    const pagination = messagesData?.pagination;

    const handleMessageClick = async (message: Message) => {
        if (isSelectMode) return;
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

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === messages.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(messages.map(m => m.id)));
        }
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleBatchRead = () => {
        if (selectedIds.size === 0) return;
        batchMarkAsRead.mutate(Array.from(selectedIds), {
            onSuccess: () => {
                exitSelectMode();
            }
        });
    };

    const handleBatchDelete = () => {
        if (selectedIds.size === 0) return;
        batchDeleteMessages.mutate(Array.from(selectedIds), {
            onSuccess: () => {
                exitSelectMode();
            }
        });
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
                            {isSelectMode ? (
                                <>
                                    <button
                                        onClick={selectAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        {selectedIds.size === messages.length ? (
                                            <CheckSquare size={14} className="text-violet-600" />
                                        ) : (
                                            <Square size={14} />
                                        )}
                                        {selectedIds.size === messages.length ? '取消全选' : '全选'}
                                    </button>
                                    <button
                                        onClick={handleBatchRead}
                                        disabled={selectedIds.size === 0 || batchMarkAsRead.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {batchMarkAsRead.isPending ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <CheckCheck size={14} />
                                        )}
                                        标记已读 ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={handleBatchDelete}
                                        disabled={selectedIds.size === 0 || batchDeleteMessages.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {batchDeleteMessages.isPending ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                        删除 ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={exitSelectMode}
                                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                        title="取消选择"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    {showSearch && (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchInput}
                                                onChange={(e) => setSearchInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setKeyword(searchInput.trim());
                                                        setPage(1);
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setShowSearch(false);
                                                        setSearchInput('');
                                                        setKeyword('');
                                                    }
                                                }}
                                                placeholder="搜索消息..."
                                                className="w-48 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                                autoFocus
                                            />
                                            {searchInput && (
                                                <button
                                                    onClick={() => {
                                                        setSearchInput('');
                                                        setKeyword('');
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (showSearch && searchInput.trim()) {
                                                setKeyword(searchInput.trim());
                                                setPage(1);
                                            } else {
                                                setShowSearch(!showSearch);
                                            }
                                        }}
                                        className={`p-2 rounded-lg transition-colors ${
                                            showSearch || keyword
                                                ? 'bg-violet-100 text-violet-600'
                                                : 'hover:bg-slate-100 text-slate-500'
                                        }`}
                                        title="搜索"
                                    >
                                        <Search size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                        title="通知设置"
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsSelectMode(true)}
                                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                        title="批量管理"
                                    >
                                        <CheckSquare size={18} />
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
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTabKey(tab.key);
                                    setPage(1);
                                }}
                                className={`
                                    px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
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
                                    selectable={isSelectMode}
                                    selected={selectedIds.has(message.id)}
                                    onToggleSelect={toggleSelect}
                                    showHandledStatus={isAdmin || isSuperAdmin}
                                />
                                {!isSelectMode && (
                                    <button
                                        onClick={(e) => handleDelete(message.id, e)}
                                        className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                        title="删除消息"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
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
