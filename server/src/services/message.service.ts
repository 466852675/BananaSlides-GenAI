import { MessageType, Prisma } from '@prisma/client';
import { prisma } from '../db';

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
    startDate?: Date;
    endDate?: Date;
}

export interface Pagination {
    page: number;
    limit: number;
}

export async function createMessage(dto: CreateMessageDTO) {
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
    const { userId, type, isRead, isImportant, bizType, startDate, endDate } = filters;
    const { page, limit } = pagination;

    const where: Prisma.UserMessageWhereInput = {
        userId,
        isDeleted: false,
    };

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (isImportant !== undefined) where.isImportant = isImportant;
    if (isRead !== undefined) where.isRead = isRead;
    if (isImportant !== undefined) where.isImportant = isImportant;
    if (bizType) {
        if (bizType.includes(',')) {
            // Support multiple bizTypes (e.g. admin_lead,admin_report)
            where.bizType = { in: bizType.split(',') };
        } else {
            where.bizType = bizType;
        }
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
