import { PrismaClient } from '@prisma/client';
import { AIService } from './ai.service';
import { AppSettings, ProjectSession } from '../types';
import { SettingService } from './setting.service';

const prisma = new PrismaClient();

// --- Memory Queue for Notifications ---
export const notificationQueue: Array<{
    id: string;
    type: 'snapshot_summary';
    projectId: string;
    snapshotId: string;
    message: string;
    timestamp: number;
}> = [];

export class SnapshotService {

    // Static poll method to match route usage, or instance method if we use instance
    // To minimize breakage, we use static for utility access or global instance pattern
    // But since the route uses `SnapshotService.pollNotifications`, let's make it static.
    static pollNotifications() {
        if (notificationQueue.length === 0) return [];
        const alerts = [...notificationQueue];
        notificationQueue.length = 0; // Clear queue
        return alerts;
    }

    // Helper: Calculate meaningful diff context
    private calculateDiff(oldData: any, newData: any): string {
        try {
            const changes: string[] = [];

            // 1. Config differences
            const oldConfig = oldData.globalConfig || {};
            const newConfig = newData.globalConfig || {};
            if (oldConfig.targetPageCount !== newConfig.targetPageCount) {
                changes.push(`Target page count changed from ${oldConfig.targetPageCount} to ${newConfig.targetPageCount}`);
            }
            if (oldConfig.styleName !== newConfig.styleName) {
                changes.push(`Style theme changed from "${oldConfig.styleName}" to "${newConfig.styleName}"`);
            }

            // 2. Items differences
            const oldItems = oldData.items || [];
            const newItems = newData.items || [];
            if (oldItems.length !== newItems.length) {
                changes.push(`Slide count changed: ${oldItems.length} -> ${newItems.length}`);
            }

            // Deep compare items (up to a limit to avoid huge prompts)
            let itemChanges = 0;
            const limit = Math.max(oldItems.length, newItems.length);

            for (let i = 0; i < limit; i++) {
                const oldItem = oldItems[i];
                const newItem = newItems[i];

                if (!oldItem && newItem) {
                    itemChanges++; // Added
                    continue;
                }
                if (oldItem && !newItem) {
                    itemChanges++; // Removed
                    continue;
                }

                // Check key fields
                let changed = false;
                if (oldItem.title !== newItem.title) {
                    changes.push(`Slide ${i + 1} title: "${oldItem.title}" -> "${newItem.title}"`);
                    changed = true;
                }
                // Check content length or rough content match
                // We use simplified check for content to avoid huge diff strings
                const oldContent = oldItem.content || oldItem.textContent || "";
                const newContent = newItem.content || newItem.textContent || "";

                if (oldContent !== newContent && !changed) { // Only log if title didn't change (avoid double log)
                    if (Math.abs(oldContent.length - newContent.length) > 5) { // Ignore minor whitespace
                        changes.push(`Slide ${i + 1} content modified`);
                        changed = true;
                    } else if (oldContent.trim() !== newContent.trim()) {
                        changes.push(`Slide ${i + 1} content tweaked`);
                        changed = true;
                    }
                }

                if (oldItem.pageType !== newItem.pageType && !changed) {
                    changes.push(`Slide ${i + 1} type: ${oldItem.pageType} -> ${newItem.pageType}`);
                    changed = true;
                }

                if (changed) itemChanges++;

                // Cap details in prompt
                if (changes.length > 5) break;
            }

            if (changes.length > 5) changes.push(`...and more changes.`);

            if (changes.length === 0) return "No significant changes detected (Routine Save).";
            return changes.join(". ");
        } catch (e) {
            return "Unable to calculate diff.";
        }
    }

    async create(projectId: string, userId: string, data: ProjectSession, settings: AppSettings) {
        // 1. Get latest snapshot
        const latest = await prisma.projectSnapshot.findFirst({
            where: {
                projectId,
                project: { userId }
            },
            orderBy: { version: 'desc' }
        });

        // 2. Calculate Diff
        let diffContext = "Initial Snapshot";
        if (latest) {
            try {
                const oldData = JSON.parse(latest.data);
                diffContext = this.calculateDiff(oldData, data);
            } catch (e) {
                console.error("Failed to parse old snapshot data", e);
            }
        }

        // 3. Determine Summary Strategy
        let summary = "常规保存";
        let shouldGenerateAsync = false;

        const ROUTINE_MSG = "No significant changes detected (Routine Save).";

        if (diffContext === ROUTINE_MSG) {
            summary = "常规保存"; // Skip AI for trivial changes
            console.log("[SnapshotService] Trivial diff, skipping AI summary.");
        } else {
            // [MODIFIED] Show immediate diff + AI pending status
            summary = `${diffContext}\n\n🤖 AI 正在智能摘要，请耐心等待...`;
            shouldGenerateAsync = true;
        }

        // 4. Create Snapshot immediately
        const version = (latest?.version || 0) + 1;
        const snapshot = await prisma.projectSnapshot.create({
            data: {
                projectId,
                // userId is not stored on Snapshot, ownership via Project
                version,
                summary,
                data: JSON.stringify(data)
            }
        });

        // 5. Async Background Update
        if (shouldGenerateAsync) {
            // Fire and forget - do not await
            (async () => {
                try {
                    console.log(`[SnapshotService] Starting async summary generation for Snapshot ${snapshot.id}...`);

                    // [SECURE FIX] Always fetch latest server-side settings to ensure API Keys are present
                    // Frontend 'settings' argument often has masked keys (e.g. "sk-****")
                    const secureSettings = await SettingService.getSettings();
                    const aiSettings = secureSettings || settings; // Fallback to passed settings if DB fails (unlikely)

                    const aiSummary = await AIService.generateSnapshotSummary(diffContext, aiSettings);

                    await prisma.projectSnapshot.update({
                        where: { id: snapshot.id },
                        data: { summary: aiSummary }
                    });
                    console.log(`[SnapshotService] Updated Snapshot ${snapshot.id} with summary: "${aiSummary}"`);

                    // Push to notification queue
                    notificationQueue.push({
                        id: Date.now().toString(),
                        type: 'snapshot_summary',
                        projectId,
                        snapshotId: snapshot.id,
                        message: `AI 智能摘要已生成: ${aiSummary.substring(0, 100)}${aiSummary.length > 100 ? '...' : ''}`,
                        timestamp: Date.now()
                    });

                } catch (e) {
                    console.error(`[SnapshotService] Async summary generation failed for ${snapshot.id}`, e);
                    // Update status to indicate failure but keep record
                    try {
                        let errorMsg = "手动保存 (摘要生成失败)";
                        if (e instanceof Error) {
                            errorMsg += `: ${e.message}`;
                        }
                        await prisma.projectSnapshot.update({
                            where: { id: snapshot.id },
                            data: { summary: errorMsg }
                        });
                    } catch (updateErr) {
                        console.error(`[SnapshotService] Failed to update error status for ${snapshot.id}`, updateErr);
                    }
                }
            })();
        }

        return snapshot;
    }

    async findAll(projectId: string, userId: string) {
        return prisma.projectSnapshot.findMany({
            where: {
                projectId,
                project: { userId }
            },
            orderBy: { version: 'desc' },
            select: {
                id: true,
                version: true,
                summary: true,
                createdAt: true
                // Do not select 'data' for list view to save bandwidth
            }
        });
    }

    async findById(id: string, userId: string) {
        const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id },
            include: { project: { select: { userId: true } } }
        });
        if (!snapshot || snapshot.project.userId !== userId) return null;
        return snapshot;
    }

    async restore(snapshotId: string, userId: string) {
        // 1. Get Snapshot
        const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id: snapshotId },
            include: { project: { select: { userId: true } } }
        });
        if (!snapshot || snapshot.project.userId !== userId) throw new Error("Snapshot not found");

        const data = JSON.parse(snapshot.data);
        const projectId = snapshot.projectId;

        // 2. Overwrite Project Data
        // Needs to update Project fields AND Items (Slides)

        // Update Project Metadata
        await prisma.project.update({
            where: { id: projectId },
            data: {
                globalConfig: JSON.stringify(data.globalConfig || {}),
                styleMap: JSON.stringify(data.globalStyleMap || {}),
                // items are handled separately via transaction usually, 
                // but here let's reuse projectService logic if possible?
                // Or just do a hard delete/create transaction here.
            }
        });

        // Update Slides (Full Replace)
        await prisma.$transaction(async (tx) => {
            // Delete all existing (no ownerId on Slide)
            await tx.slide.deleteMany({ where: { projectId } });

            // Re-create from snapshot - use loop instead of createMany for compatibility
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    await tx.slide.create({
                        data: {
                            id: item.id,
                            projectId,
                            // ownerId, // Slide has no ownerId
                            index: item.index || 0,
                            pageType: item.pageType,
                            contentType: item.contentType,
                            title: item.title,
                            content: item.textContent || item.content || '',
                            brief: item.brief,
                            variants: JSON.stringify(item.variants || []),
                            variantCount: item.variantCount || 2,
                            previewUrl: item.previewUrl,
                            originalFileRef: item.originalFile ? JSON.stringify(item.originalFile) : null,
                            status: item.status
                        }
                    });
                }
            }
        });

        return { success: true };
    }

    async delete(id: string, userId: string) {
        const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id },
            include: { project: { select: { userId: true } } }
        });
        if (!snapshot || snapshot.project.userId !== userId) return null;
        return prisma.projectSnapshot.delete({ where: { id } });
    }
}

export const snapshotService = new SnapshotService();
