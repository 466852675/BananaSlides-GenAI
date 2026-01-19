import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
import { saveBase64Image, isBase64Image } from '../utils/imageSaver';

export class ProjectService {

    // Helper: Generate Display ID (PID-YYMMDD-XXXXXX)
    private generateDisplayId(): string {
        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        const timestamp = `${yy}${mm}${dd}`;

        // 6-char Random Hex
        const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();

        return `PID-${timestamp}-${randomHex}`;
    }

    // Get list (now includes items for thumbnails and progress calculation)
    async findAll() {
        const projects = await prisma.project.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                items: {
                    orderBy: { index: 'asc' }
                    // Removed 'take: 5' - we need all items for accurate progress calculation
                }
            }
        });

        // Lazy Migration: Backfill displayId for existing projects
        const migrations = [];
        for (const p of projects) {
            if (!p.displayId) {
                const newId = this.generateDisplayId();
                p.displayId = newId; // Update in-memory object

                // Update in DB (fire and forget or wait)
                migrations.push(prisma.project.update({
                    where: { id: p.id },
                    data: { displayId: newId }
                }));
            }
        }

        if (migrations.length > 0) {
            // Use transaction to avoid SQLite "database is locked" errors with concurrent updates
            await prisma.$transaction(migrations);
        }

        return projects;
    }

    // Get detail
    async findById(id: string) {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { index: 'asc' }
                }
            }
        });

        if (project) {
            await this.migrateProjectImages(project);
        }

        return project;
    }

    // Helper: Migrate Base64 to File (Lazy)
    private async migrateProjectImages(project: any) {
        if (!project || !project.items) return;

        let projectChanged = false;
        const updates = [];

        for (const item of project.items) {
            if (!item.variants) continue;

            let variants: string[] = [];
            try {
                if (typeof item.variants === 'string') {
                    variants = JSON.parse(item.variants);
                } else {
                    variants = item.variants;
                }
            } catch (e) { continue; }

            let itemChanged = false;
            const newVariants: string[] = [];

            for (const v of variants) {
                if (isBase64Image(v)) {
                    try {
                        const url = await saveBase64Image(v, `p_${project.id}_s_${item.id}`);
                        newVariants.push(url);
                        itemChanged = true;
                        projectChanged = true;
                    } catch (e) {
                        console.error('Failed to migrate image:', e);
                        newVariants.push(v); // Keep original if failed
                    }
                } else {
                    newVariants.push(v);
                }
            }

            if (itemChanged) {
                // Update item in memory
                item.variants = JSON.stringify(newVariants);

                // Queue DB update
                updates.push(prisma.slide.update({
                    where: { id: item.id },
                    data: { variants: item.variants }
                }));
            }
        }

        if (updates.length > 0) {
            console.log(`[ProjectService] Migrated ${updates.length} items from Base64 to Files for project ${project.id}`);
            // Fire and forget, or await? Await to ensure safety.
            await prisma.$transaction(updates);
        }
    }

    // Create
    async create(data: Prisma.ProjectCreateInput) {
        return prisma.project.create({
            data: {
                ...data,
                displayId: this.generateDisplayId()
            },
            include: {
                items: true
            }
        });
    }

    // Update
    async update(id: string, data: Prisma.ProjectUpdateInput) {
        return prisma.project.update({
            where: { id },
            data
        });
    }

    // Set Pinned Status
    async setPinnedStatus(id: string, isPinned: boolean) {
        // Use standard Prisma update to ensure compatibility (avoids table name issues)
        return prisma.project.update({
            where: { id },
            data: { isPinned }
        });
    }

    // Sync Slides (Update or create slides, preserving IDs)
    async syncSlides(projectId: string, slides: any[]) {
        // Use transaction to upsert slides
        return prisma.$transaction(async (tx) => {
            // Get existing slides to determine which to delete
            const existingSlides = await tx.slide.findMany({
                where: { projectId },
                select: { id: true }
            });

            const existingIds = new Set(existingSlides.map(s => s.id));
            const incomingIds = new Set(slides.map(s => s.id).filter(Boolean));

            // Delete slides that are no longer in the incoming data
            const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
            if (idsToDelete.length > 0) {
                await tx.slide.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }

            // Upsert each slide (update if exists, create if not)
            for (let index = 0; index < slides.length; index++) {
                const slide = slides[index];
                const slideData = {
                    projectId,
                    index,
                    pageType: slide.pageType || 'content',
                    contentType: slide.contentType || 'text',
                    title: slide.title || 'Untitled',
                    content: slide.textContent || slide.content || '',
                    brief: slide.brief || '',
                    variants: JSON.stringify(slide.variants || []),
                    // Enforce max 4 variants (Backend Guard)
                    variantCount: Math.min(Math.max(slide.variantCount || 2, 1), 4),
                    previewUrl: slide.previewUrl || null,
                    originalFileRef: slide.originalFile ? JSON.stringify(slide.originalFile) : null,
                    status: slide.status || 'idle'
                };

                if (slide.id && existingIds.has(slide.id)) {
                    // Update existing slide
                    await tx.slide.update({
                        where: { id: slide.id },
                        data: slideData
                    });
                } else {
                    // Create new slide
                    await tx.slide.create({
                        data: {
                            id: slide.id, // Preserve the ID from frontend
                            ...slideData
                        }
                    });
                }
            }

            // Return updated project with slides
            return tx.project.findUnique({
                where: { id: projectId },
                include: { items: { orderBy: { index: 'asc' } } }
            });
        });
    }

    // Delete
    async delete(id: string) {
        return prisma.project.delete({
            where: { id }
        });
    }
}

export const projectService = new ProjectService();
