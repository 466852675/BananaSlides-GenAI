import { MessageType, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { shouldSendMessage } from './message-settings.service';

export interface CreateMessageDTO {
    userId: string;
    type: MessageType;
    title: string;
    content: string;
    summary?: string;
    bizType?: string;
    bizId?: string;
    actionUrl?: string;
    isImportant?: boolean;
}

export interface MessageListFilters {
    userId: string;
    type?: MessageType;
    isRead?: boolean;
    isImportant?: boolean;
    bizType?: string;
    excludeBizType?: string;
    startDate?: Date;
    endDate?: Date;
    keyword?: string;
    includeArchived?: boolean;
}

export interface Pagination {
    page: number;
    limit: number;
}

export async function createMessage(dto: CreateMessageDTO) {
    // 检查用户消息设置，如果关闭了浏览器推送则不创建消息
    const shouldSend = await shouldSendMessage(dto.userId, dto.type, 'browser');
    if (!shouldSend) {
        return null;
    }

    const message = await prisma.userMessage.create({
        data: {
            userId: dto.userId,
            type: dto.type,
            title: dto.title,
            content: dto.content,
            summary: dto.summary,
            bizType: dto.bizType,
            bizId: dto.bizId,
            actionUrl: dto.actionUrl,
            isImportant: dto.isImportant ?? false,
            isRead: false,
        },
    });

    return message;
}

export async function getMessages(
    filters: MessageListFilters,
    pagination: Pagination
) {
    const { userId, type, isRead, isImportant, bizType, excludeBizType, startDate, endDate, keyword, includeArchived } = filters;
    const { page, limit } = pagination;

    const where: Prisma.UserMessageWhereInput = {
        userId,
        isDeleted: false,
        ...(includeArchived ? {} : { isArchived: false }),
    };

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (isImportant !== undefined) where.isImportant = isImportant;
    if (bizType) {
        if (bizType.includes(',')) {
            where.bizType = { in: bizType.split(',') };
        } else {
            where.bizType = bizType;
        }
    }
    if (excludeBizType) {
        where.bizType = { not: excludeBizType };
    }
    if (keyword) {
        where.OR = [
            { title: { contains: keyword } },
            { content: { contains: keyword } },
            { summary: { contains: keyword } },
        ];
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [items, total] = await Promise.all([
        prisma.userMessage.findMany({
            where,
            orderBy: [
                { isImportant: 'desc' },
                { createdAt: 'desc' },
            ],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.userMessage.count({ where }),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getMessageById(messageId: string, userId: string) {
    const message = await prisma.userMessage.findFirst({
        where: {
            id: messageId,
            userId,
            isDeleted: false,
        },
    });

    return message;
}

export async function markAsRead(messageId: string, userId: string) {
    const message = await prisma.userMessage.updateMany({
        where: {
            id: messageId,
            userId,
            isDeleted: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    return message.count > 0;
}

export async function markAllAsRead(userId: string) {
    const result = await prisma.userMessage.updateMany({
        where: {
            userId,
            isRead: false,
            isDeleted: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    return result.count;
}

export async function deleteMessage(messageId: string, userId: string) {
    const result = await prisma.userMessage.updateMany({
        where: {
            id: messageId,
            userId,
            isDeleted: false,
        },
        data: {
            isDeleted: true,
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
}

/**
 * 批量删除消息（软删除）
 */
export async function deleteMessages(messageIds: string[], userId: string) {
    const result = await prisma.userMessage.updateMany({
        where: {
            id: { in: messageIds },
            userId,
            isDeleted: false,
        },
        data: {
            isDeleted: true,
            updatedAt: new Date(),
        },
    });

    return result.count;
}

export async function markMessagesAsRead(messageIds: string[], userId: string) {
    const result = await prisma.userMessage.updateMany({
        where: {
            id: { in: messageIds },
            userId,
            isRead: false,
            isDeleted: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    return result.count;
}

export async function getUnreadCount(userId: string) {
    const count = await prisma.userMessage.count({
        where: {
            userId,
            isRead: false,
            isDeleted: false,
        },
    });

    return count;
}

export async function getUnreadCountByType(userId: string) {
    const counts = await prisma.userMessage.groupBy({
        by: ['type'],
        where: {
            userId,
            isRead: false,
            isDeleted: false,
        },
        _count: {
            type: true,
        },
    });

    const result: Record<string, number> = {};
    for (const item of counts) {
        result[item.type] = item._count.type;
    }

    return result;
}

export async function markMessageAsHandled(
    messageId: string,
    userId: string,
    action: string
) {
    const message = await prisma.userMessage.updateMany({
        where: {
            id: messageId,
            isDeleted: false,
        },
        data: {
            handledBy: userId,
            handledAt: new Date(),
            handleAction: action,
        },
    });

    return message.count > 0;
}

export async function getMessagesByBizId(bizId: string, userId: string) {
    return await prisma.userMessage.findMany({
        where: {
            bizId,
            userId,
            isDeleted: false,
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function archiveMessage(messageId: string, userId: string) {
    const result = await prisma.userMessage.updateMany({
        where: {
            id: messageId,
            userId,
            isDeleted: false,
        },
        data: {
            isArchived: true,
            archivedAt: new Date(),
        },
    });

    return result.count > 0;
}

export async function archiveMessages(messageIds: string[], userId: string) {
    const result = await prisma.userMessage.updateMany({
        where: {
            id: { in: messageIds },
            userId,
            isDeleted: false,
        },
        data: {
            isArchived: true,
            archivedAt: new Date(),
        },
    });

    return result.count;
}

export async function cleanupExpiredMessages() {
    const now = new Date();
    const result = await prisma.userMessage.updateMany({
        where: {
            expiresAt: { lt: now },
            isDeleted: false,
            isArchived: false,
        },
        data: {
            isArchived: true,
            archivedAt: now,
        },
    });

    return result.count;
}
