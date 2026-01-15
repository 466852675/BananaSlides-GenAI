import { PrismaClient } from '@prisma/client';
import { AIService } from './ai.service';
import { AppSettings, ProjectSession } from '../types';

const prisma = new PrismaClient();

export class SnapshotService {

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

            // Check title changes (limit to 3 examples)
            let titleChanges = 0;
            for (let i = 0; i < Math.min(oldItems.length, newItems.length); i++) {
                if (oldItems[i].title !== newItems[i].title) {
                    titleChanges++;
                    if (titleChanges <= 3) {
                         changes.push(`Slide ${i+1} title changed: "${oldItems[i].title}" -> "${newItems[i].title}"`);
                    }
                }
            }
            if (titleChanges > 3) changes.push(`...and ${titleChanges - 3} other title changes`);

            if (changes.length === 0) return "No significant changes detected (Routine Save).";
            return changes.join(". ");
        } catch (e) {
            return "Unable to calculate diff.";
        }
    }

    async create(projectId: string, data: ProjectSession, settings: AppSettings) {
        // 1. Get latest snapshot
        const latest = await prisma.projectSnapshot.findFirst({
            where: { projectId },
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

        // 3. Generate AI Summary
        console.log(`[SnapshotService] Generating summary for diff: ${diffContext}`);
        let summary = "Routine Save";
        try {
            summary = await AIService.generateSnapshotSummary(diffContext, settings);
        } catch (e) {
            console.error("Failed to generate AI summary", e);
            summary = "手动保存记录";
        }

        // 4. Save
        const version = (latest?.version || 0) + 1;
        return prisma.projectSnapshot.create({
            data: {
                projectId,
                version,
                summary,
                data: JSON.stringify(data)
            }
        });
    }

    async findAll(projectId: string) {
        return prisma.projectSnapshot.findMany({
            where: { projectId },
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

    async findById(id: string) {
        return prisma.projectSnapshot.findUnique({
             where: { id }
        });
    }

    async restore(snapshotId: string) {
        // 1. Get Snapshot
        const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id: snapshotId }
        });
        if (!snapshot) throw new Error("Snapshot not found");

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
             // Delete all existing
             await tx.slide.deleteMany({ where: { projectId } });

             // Re-create from snapshot - use loop instead of createMany for compatibility
             if (data.items && data.items.length > 0) {
                 for (const item of data.items) {
                     await tx.slide.create({
                         data: {
                             id: item.id,
                             projectId,
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

    async delete(id: string) {
        return prisma.projectSnapshot.delete({ where: { id } });
    }
}

export const snapshotService = new SnapshotService();
