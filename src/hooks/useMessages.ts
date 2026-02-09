// src/hooks/useMessages.ts
// 消息中心数据管理 Hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as MessageApi from '../api/message';

// Query Keys
const MESSAGES_KEY = 'messages';
const UNREAD_COUNT_KEY = 'messages-unread-count';

/**
 * 获取未读消息数量
 */
export function useUnreadCount() {
    return useQuery({
        queryKey: [UNREAD_COUNT_KEY],
        queryFn: MessageApi.getUnreadCount,
        refetchInterval: 60000, // 每分钟刷新一次
        staleTime: 30000, // 30秒内不重复请求
    });
}

/**
 * 获取消息列表
 */
export function useMessages(params: MessageApi.MessageListParams = {}) {
    return useQuery({
        queryKey: [MESSAGES_KEY, params],
        queryFn: () => MessageApi.getMessages(params),
    });
}

/**
 * 获取消息详情
 */
export function useMessage(id: string | null) {
    return useQuery({
        queryKey: [MESSAGES_KEY, id],
        queryFn: () => MessageApi.getMessageById(id!),
        enabled: !!id,
    });
}

/**
 * 标记消息为已读
 */
export function useMarkAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: MessageApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY] });
            queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
        },
    });
}

/**
 * 标记所有消息为已读
 */
export function useMarkAllAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: MessageApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY] });
            queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
        },
    });
}

/**
 * 删除消息
 */
export function useDeleteMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: MessageApi.deleteMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY] });
            queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
        },
    });
}
