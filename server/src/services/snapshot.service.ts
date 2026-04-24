import { AIService } from './ai.service';
import { AppSettings, ProjectSession } from '../types';
import { SettingService } from './setting.service';
import { prisma } from '../db';
import { sanitizeStyleMap } from '../utils/file';

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
    private toGlobalStyleMap(styleMap: Record<string, string | null> | null): ProjectSession['globalStyleMap'] {
        return {
            cover: styleMap?.cover ?? null,
            directory: styleMap?.directory ?? null,
            transition: styleMap?.transition ?? null,
            content: styleMap?.content ?? null,
            end: styleMap?.end ?? null,
            custom: styleMap?.custom ?? null
        };
    }

    private async sanitizeSnapshotDataString(dataString: string): Promise<{ dataString: string; changed: boolean }> {
        try {
            const parsed = JSON.parse(dataString) as ProjectSession & { styleMap?: Record<string, string | null> };
            const sourceStyleMap = parsed.globalStyleMap ?? parsed.styleMap ?? null;
            const { styleMap, changed } = await sanitizeStyleMap(sourceStyleMap);

            if (!changed) {
                return { dataString, changed: false };
            }

            if ('globalStyleMap' in parsed || !('styleMap' in parsed)) {
                parsed.globalStyleMap = this.toGlobalStyleMap(styleMap);
            } else {
                parsed.styleMap = this.toGlobalStyleMap(styleMap);
            }

            return {
                dataString: JSON.stringify(parsed),
                changed: true
            };
        } catch {
            return { dataString, changed: false };
        }
    }

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
                Project: { userId }
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

    async findAll(projectId: string, userId: string, isAdmin: boolean = false) {
        return prisma.projectSnapshot.findMany({
            where: isAdmin ? { projectId } : {
                projectId,
                Project: { userId }
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
            include: { Project: { select: { userId: true } } }
        });
        if (!snapshot || snapshot.Project.userId !== userId) return null;

        const { dataString, changed } = await this.sanitizeSnapshotDataString(snapshot.data);
        if (changed) {
            await prisma.projectSnapshot.update({
                where: { id: snapshot.id },
                data: { data: dataString }
            });
            snapshot.data = dataString;
        }

        return snapshot;
    }

    async restore(snapshotId: string, userId: string) {
        // 1. Get Snapshot
        const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id: snapshotId },
            include: { Project: { select: { userId: true } } }
        });
        if (!snapshot || snapshot.Project.userId !== userId) throw new Error("Snapshot not found");

        const { dataString, changed } = await this.sanitizeSnapshotDataString(snapshot.data);
        if (changed) {
            await prisma.projectSnapshot.update({
                where: { id: snapshot.id },
                data: { data: dataString }
            });
            snapshot.data = dataString;
        }

        const data = JSON.parse(snapshot.data);
        const projectId = snapshot.projectId;
        const { styleMap } = await sanitizeStyleMap(data.globalStyleMap || data.styleMap || null);

        // 2. Overwrite Project Data
        // Needs to update Project fields AND Items (Slides)

        // Update Project Metadata
        await prisma.project.update({
            where: { id: projectId },
            data: {
                globalConfig: JSON.stringify(data.globalConfig || {}),
                styleMap: JSON.stringify(styleMap || {}),
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
            include: { Project: { select: { userId: true } } }
        });
        if (!snapshot || snapshot.Project.userId !== userId) return null;
        return prisma.projectSnapshot.delete({ where: { id } });
    }

    // Fork snapshot as a new project
    async fork(snapshotId: string, userId: string) {
        // 1. Get Snapshot
        const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id: snapshotId },
            include: { Project: { select: { userId: true, title: true, scenarioType: true } } }
        });
        if (!snapshot || snapshot.Project.userId !== userId) {
            throw new Error("Snapshot not found or access denied");
        }

        const data = JSON.parse(snapshot.data);
        const originalProject = snapshot.Project;

        // 2. Generate new display ID
        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        const timestamp = `${yy}${mm}${dd}`;
        const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
        const displayId = `PID-${timestamp}-${randomHex}`;

        // 3. Create new project with copied data
        const { styleMap } = await sanitizeStyleMap(data.globalStyleMap || data.styleMap || null);

        const newProject = await prisma.$transaction(async (tx) => {
            // Create project
            const project = await tx.project.create({
                data: {
                    userId,
                    displayId,
                    title: `${originalProject.title} (副本 v${snapshot.version})`,
                    globalConfig: JSON.stringify(data.globalConfig || {}),
                    styleMap: JSON.stringify(styleMap || {}),
                    status: 'idle',
                    scenarioType: originalProject.scenarioType || 'BUSINESS'
                }
            });

            // Create slides from snapshot items
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    await tx.slide.create({
                        data: {
                            projectId: project.id,
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
                            status: item.status === 'completed' ? 'success' : (item.status || 'idle')
                        }
                    });
                }
            }

            return project;
        });

        return { success: true, projectId: newProject.id, displayId: newProject.displayId };
    }
}

export const snapshotService = new SnapshotService();
