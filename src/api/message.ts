// src/api/message.ts
// 消息中心 API 封装

import { client } from './client';

// ============================================================
// 类型定义
// ============================================================

export type MessageType = 'SYSTEM' | 'ORDER' | 'REFUND' | 'AI' | 'POINTS' | 'VIP' | 'ACTIVITY' | 'SECURITY';

export interface Message {
    id: string;
    userId: string;
    type: MessageType;
    title: string;
    content: string;
    summary?: string;
    bizType?: string;
    bizId?: string;
    actionUrl?: string;
    isRead?: boolean; // Changed from required to optional
    readAt?: string;
    isImportant?: boolean; // Changed from required to optional
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MessageListParams {
    page?: number;
    limit?: number;
    type?: MessageType;
    isRead?: boolean;
}

export interface MessageListResponse {
    items: Message[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface UnreadCountResponse {
    total: number;
    byType: Record<string, number>;
}

// ============================================================
// API 调用
// ============================================================

/**
 * 获取消息列表
 */
export async function getMessages(params: MessageListParams = {}): Promise<MessageListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.type) queryParams.append('type', params.type);
    if (params.isRead !== undefined) queryParams.append('isRead', String(params.isRead));

    const queryString = queryParams.toString();
    const url = `/messages${queryString ? `?${queryString}` : ''}`;

    const result = await client.get(url) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取消息列表失败');
}

/**
 * 获取未读消息数量
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
    const result = await client.get('/messages/unread-count') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取未读数量失败');
}

/**
 * 获取消息详情
 */
export async function getMessageById(id: string): Promise<Message> {
    const result = await client.get(`/messages/${id}`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取消息详情失败');
}

/**
 * 标记消息为已读
 */
export async function markAsRead(id: string): Promise<void> {
    const result = await client.post(`/messages/${id}/read`, {}) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '标记已读失败');
    }
}

/**
 * 标记所有消息为已读
 */
export async function markAllAsRead(): Promise<{ count: number }> {
    const result = await client.post('/messages/read-all', {}) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '全部标记已读失败');
}

/**
 * 删除消息
 */
export async function deleteMessage(id: string): Promise<void> {
    const result = await client.delete(`/messages/${id}`) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '删除消息失败');
    }
}

// ============================================================
// 消息设置 API
// ============================================================

export interface MessageSettings {
    userId: string;
    emailEnabled: boolean;
    browserEnabled: boolean;
    preferences: Record<string, { email: boolean; browser: boolean }>;
}

export interface UpdateMessageSettingsDTO {
    emailEnabled?: boolean;
    browserEnabled?: boolean;
    preferences?: Record<string, { email: boolean; browser: boolean }>;
}

/**
 * 获取消息设置
 */
export async function getMessageSettings(): Promise<MessageSettings> {
    const result = await client.get('/messages/settings') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取设置失败');
}

/**
 * 更新消息设置
 */
export async function updateMessageSettings(data: UpdateMessageSettingsDTO): Promise<MessageSettings> {
    const result = await client.put('/messages/settings', data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '更新设置失败');
}
