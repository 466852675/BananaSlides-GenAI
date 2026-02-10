import { prisma } from '../db';

const ARCHIVE_AFTER_DAYS = 30;
const DELETE_AFTER_DAYS = 90;

export async function archiveOldMessages(): Promise<number> {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - ARCHIVE_AFTER_DAYS);

    const result = await prisma.userMessage.updateMany({
        where: {
            isArchived: false,
            isDeleted: false,
            createdAt: { lt: archiveDate },
        },
        data: {
            isArchived: true,
            archivedAt: new Date(),
        },
    });

    console.log(`[MessageArchive] Archived ${result.count} old messages`);
    return result.count;
}

export async function deleteArchivedMessages(): Promise<number> {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - DELETE_AFTER_DAYS);

    const result = await prisma.userMessage.deleteMany({
        where: {
            isArchived: true,
            archivedAt: { lt: deleteDate },
        },
    });

    console.log(`[MessageArchive] Deleted ${result.count} archived messages`);
    return result.count;
}

export async function archiveUserMessage(messageId: string, userId: string): Promise<boolean> {
    try {
        await prisma.userMessage.update({
            where: {
                id: messageId,
                userId,
            },
            data: {
                isArchived: true,
                archivedAt: new Date(),
            },
        });
        return true;
    } catch (error) {
        console.error('[MessageArchive] Failed to archive message:', error);
        return false;
    }
}

export async function unarchiveUserMessage(messageId: string, userId: string): Promise<boolean> {
    try {
        await prisma.userMessage.update({
            where: {
                id: messageId,
                userId,
            },
            data: {
                isArchived: false,
                archivedAt: null,
            },
        });
        return true;
    } catch (error) {
        console.error('[MessageArchive] Failed to unarchive message:', error);
        return false;
    }
}

export async function runCleanupJob(): Promise<{ archived: number; deleted: number }> {
    console.log('[MessageArchive] Starting cleanup job...');
    
    const archived = await archiveOldMessages();
    const deleted = await deleteArchivedMessages();

    console.log(`[MessageArchive] Cleanup job completed: ${archived} archived, ${deleted} deleted`);
    return { archived, deleted };
}

export default {
    archiveOldMessages,
    deleteArchivedMessages,
    archiveUserMessage,
    unarchiveUserMessage,
    runCleanupJob,
};
