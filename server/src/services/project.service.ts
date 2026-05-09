import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { saveBase64Image, isBase64Image } from '../utils/imageSaver';
import { resourceService } from './resource.service';
import { sanitizeStyleMap } from '../utils/file';

export class ProjectService {
    private async sanitizeProjectStyleMap<T extends { id: string; styleMap: string | null }>(project: T): Promise<T> {
        const { styleMap, changed } = await sanitizeStyleMap(project.styleMap);
        if (!changed) {
            return project;
        }

        const serialized = styleMap ? JSON.stringify(styleMap) : null;
        await prisma.project.update({
            where: { id: project.id },
            data: { styleMap: serialized }
        });

        return {
            ...project,
            styleMap: serialized
        };
    }

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

    // Get list (支持管理员全局视图，排除回收箱项目)
    async findAll(userId: string, isAdmin: boolean = false) {
        const projects = await prisma.project.findMany({
            where: isAdmin ? { isDeleted: false } : { userId, isDeleted: false },  // 排除回收箱项目
            orderBy: { updatedAt: 'desc' },
            include: {
                Slide: {
                    orderBy: { index: 'asc' }
                }
            }
        });

        // Lazy Migration: Backfill displayId for existing projects
        const migrations = [];
        const sanitizedProjects = [];
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

            // Lazy Migration: Backfill completedAt for legacy projects
            if (p.status === 'completed' && !p.completedAt) {
                p.completedAt = p.updatedAt; // Update in-memory for immediate correct display
                migrations.push(prisma.project.update({
                    where: { id: p.id },
                    data: { completedAt: p.updatedAt }
                }));
            }

            sanitizedProjects.push(await this.sanitizeProjectStyleMap(p));
        }

        if (migrations.length > 0) {
            // Use transaction to avoid SQLite "database is locked" errors with concurrent updates
            await prisma.$transaction(migrations);
        }

        // Map Slide field to items for frontend compatibility
        return sanitizedProjects.map(p => this.mapSlideToItems(p));
    }

    async countActive(ownerId: string) {
        return prisma.project.count({
            where: {
                userId: ownerId,
                isDeleted: false
            }
        });
    }

    // Get detail
    async findById(id: string, userId: string, isAdmin: boolean = false) {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                Slide: {
                    orderBy: { index: 'asc' }
                }
            }
        });

        // 管理员可以访问所有项目,普通用户只能访问自己的
        if (!isAdmin && project && project.userId !== userId) return null;

        if (project) {
            const sanitizedProject = await this.sanitizeProjectStyleMap(project);
            Object.assign(project, sanitizedProject);
            await this.migrateProjectImages(project);
        }

        // Map Slide field to items for frontend compatibility
        return project ? this.mapSlideToItems(project) : null;
    }

    // Helper: Map Slide field to items for frontend compatibility
    private mapSlideToItems<T extends { Slide?: any[] }>(project: T): any {
        const { Slide, ...rest } = project;
        return {
            ...rest,
            items: Slide || []
        };
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
    async create(ownerId: string, data: any) {
        const project = await prisma.project.create({
            data: {
                ...data,
                userId: ownerId,
                displayId: this.generateDisplayId()
            },
            include: {
                Slide: true
            }
        });
        // Map Slide field to items for frontend compatibility
        return this.mapSlideToItems(project);
    }

    // Update
    async update(id: string, userId: string, data: Prisma.ProjectUpdateInput, isAdmin: boolean = false) {
        // Fetch current state to prevent overwriting completedAt
        const current = await prisma.project.findUnique({ where: { id } });
        // 管理员可以更新所有项目，普通用户只能更新自己的
        if (!isAdmin && (!current || current.userId !== userId)) return null;

        const dataKeys = Object.keys(data as object);
        const shouldUpdateUpdatedAt = dataKeys.some(key =>
            key !== 'isPinned' && key !== 'status'
        );

        // Logic: Only update completedAt if:
        // 1. Transitioning to 'completed' (from non-completed)
        // 2. Repairing: Is 'completed' but missing timestamp
        if (data.status === 'completed' && current?.status !== 'completed') {
            (data as any).completedAt = new Date();
        } else if (current?.status === 'completed' && !current.completedAt) {
            // Backfill with current updatedAt (best guess) or new Date()
            (data as any).completedAt = current.updatedAt;
        }
        // Otherwise: Do NOT update completedAt. It stays fixed.

        // Update updatedAt for meaningful changes (title, globalConfig, styleMap, items)
        if (shouldUpdateUpdatedAt) {
            (data as any).updatedAt = new Date();
        }

        const result = await prisma.project.update({
            where: { id },
            data: data,
            include: { Slide: true }
        });

        // 检查是否刚刚完成 (状态变为 completed)
        if (data.status === 'completed' && current?.status !== 'completed' && result.userId) {
            // 异步发送通知，不阻塞主流程
            import('./ai-notification.service').then(({ notifyPPTGenerated }) => {
                notifyPPTGenerated({
                    userId: result.userId!,
                    projectId: id,
                    title: result.title
                }).catch(err => console.error('[ProjectService] Failed to send AI notification:', err));
            });
        }

        return this.mapSlideToItems(result);
    }

    // Set Pinned Status
    async setPinnedStatus(id: string, userId: string, isPinned: boolean, isAdmin: boolean = false) {
        const current = await prisma.project.findUnique({ where: { id } });
        if (!isAdmin && (!current || current.userId !== userId)) return null;
        return prisma.project.update({
            where: { id },
            data: {
                isPinned,
                updatedAt: current?.updatedAt
            },
            include: { Slide: true }
        });
    }

    // Sync Slides (Update or create slides, preserving IDs)
    async syncSlides(projectId: string, userId: string, slides: any[], isAdmin: boolean = false) {
        // Use transaction to upsert slides
        return prisma.$transaction(async (tx) => {
            const currentProject = await tx.project.findUnique({ where: { id: projectId } });
            if (!isAdmin && (!currentProject || currentProject.userId !== userId)) return null;

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
                const toVariantArray = (input: any): string[] => {
                    const extract = (x: any): string | undefined => {
                        if (!x) return undefined;
                        if (typeof x === 'string') return x;
                        if (typeof x === 'object') {
                            const candidates = [x.url, x.src, x.path, x.previewUrl, x.href];
                            return candidates.find((v) => typeof v === 'string' && v.length > 0);
                        }
                        return undefined;
                    };
                    const normalizeArray = (arr: any[]) =>
                        arr.map(extract).filter((v): v is string => typeof v === 'string' && v.length > 0);

                    const tryParse = (s: string): any | undefined => {
                        try {
                            return JSON.parse(s);
                        } catch {
                            return undefined;
                        }
                    };

                    if (Array.isArray(input)) return normalizeArray(input);
                    if (typeof input !== 'string') return [];
                    const first = tryParse(input);
                    if (first === undefined) return input ? [input] : [];
                    if (Array.isArray(first)) return normalizeArray(first);
                    if (typeof first === 'string') {
                        const second = tryParse(first);
                        if (Array.isArray(second)) return normalizeArray(second);
                        return first ? [first] : [];
                    }
                    return [];
                };

                const slideData = {
                    projectId,
                    index,
                    pageType: slide.pageType || 'content',
                    contentType: slide.contentType || 'text',
                    title: slide.title || 'Untitled',
                    content: slide.textContent || slide.content || '',
                    brief: slide.brief || '',
                    variants: JSON.stringify(toVariantArray(slide.variants)),
                    // Enforce max 4 variants (Backend Guard)
                    variantCount: Math.min(Math.max(slide.variantCount || 2, 1), 4),
                    previewUrl: slide.previewUrl || null,
                    originalFileRef: slide.originalFile ? JSON.stringify(slide.originalFile) : null,
                    svgContent: slide.svgContent || null,
                    status: slide.status || 'idle'
                };

                // 使用 upsert 避免 ID 冲突
                // 如果 slide.id 存在且在当前项目中，更新它
                // 如果 slide.id 不存在或不在当前项目中，创建新的（让数据库生成 ID）
                if (slide.id && existingIds.has(slide.id)) {
                    // Update existing slide
                    await tx.slide.update({
                        where: { id: slide.id },
                        data: slideData
                    });
                } else {
                    // Create new slide - 不传递 ID，让数据库自动生成
                    await tx.slide.create({
                        data: slideData
                    });
                }
            }

            // Return updated project with slides
            const updatedProject = await tx.project.findUnique({
                where: { id: projectId },
                include: { Slide: { orderBy: { index: 'asc' } } }
            });
            // Map Slide field to items for frontend compatibility
            return updatedProject ? this.mapSlideToItems(updatedProject) : null;
        });
    }

    async softDelete(id: string, userId: string, isAdmin: boolean = false) {
        const project = await prisma.project.findUnique({ where: { id } });

        // Ownership / Permission Check
        if (!project) return null;
        if (!isAdmin && project.userId !== userId) return null;

        // 如果已经在回收箱，不允许再次删除
        if (project.isDeleted) return null;

        // 使用事务执行软删除
        await prisma.$transaction(async (tx) => {
            // 1. 标记项目软删除
            await tx.project.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: isAdmin ? 'admin' : 'user'
                }
            });

            // 2. 标记 AgentSession 删除（如果存在）
            await tx.agentSession.updateMany({
                where: { projectId: id, isDeleted: false },
                data: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            });

            // 3. 归档关联资源
            await tx.assetRegistry.updateMany({
                where: { projectId: id, status: 'ACTIVE' },
                data: {
                    status: 'TRASHED'
                }
            });

            // 4. 记录操作日志
            await tx.auditLog.create({
                data: {
                    userId,
                    type: 'PROJECT_SOFT_DELETE',
                    content: id,
                    reason: `deletedBy: ${isAdmin ? 'admin' : 'user'}`,
                    severity: 'INFO'
                }
            });
        });

        return project;
    }

    async restore(id: string, userId: string, isAdmin: boolean = false) {
        const existingProject = await prisma.project.findUnique({ where: { id } });

        // Ownership / Permission Check
        if (!existingProject) return null;
        if (!isAdmin && existingProject.userId !== userId) return null;

        // 必须在回收箱中才能恢复
        if (!existingProject.isDeleted) return null;

        // 检查是否过期（30天）
        const TRASH_RETENTION_DAYS = 30;
        if (existingProject.deletedAt) {
            const expiresAt = new Date(existingProject.deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            if (expiresAt < new Date()) {
                return null; // 已过期，无法恢复
            }
        }

        // 使用事务执行恢复
        await prisma.$transaction(async (tx) => {
            // 1. 恢复项目
            await tx.project.update({
                where: { id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                }
            });

            // 2. 恢复 AgentSession（如果存在）
            await tx.agentSession.updateMany({
                where: { projectId: id, isDeleted: true },
                data: {
                    isDeleted: false,
                    deletedAt: null
                }
            });

            // 3. 恢复关联资源
            await tx.assetRegistry.updateMany({
                where: { projectId: id, status: 'TRASHED' },
                data: {
                    status: 'ACTIVE'
                }
            });

            // 4. 记录操作日志
            await tx.auditLog.create({
                data: {
                    userId,
                    type: 'PROJECT_RESTORE',
                    content: id,
                    severity: 'INFO'
                }
            });
        });

        // 返回恢复后的项目
        const project = await prisma.project.findUnique({
            where: { id },
            include: { Slide: { orderBy: { index: 'asc' } } }
        });
        // Map Slide field to items for frontend compatibility
        return project ? this.mapSlideToItems(project) : null;
    }

    async listTrash(ownerId: string) {
        const TRASH_RETENTION_DAYS = 30;
        const trashProjects = await prisma.project.findMany({
            where: {
                userId: ownerId,
                isDeleted: true,
                deletedAt: { not: null }
            },
            orderBy: { deletedAt: 'desc' },
            include: {
                Slide: {
                    orderBy: { index: 'asc' }
                }
            }
        });

        // 计算剩余天数和过期时间
        // Map Slide field to items for frontend compatibility
        return trashProjects.map(p => {
            const mapped = this.mapSlideToItems(p);
            return {
                ...mapped,
                expiresAt: new Date(p.deletedAt!.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000),
                remainingDays: Math.max(0, Math.ceil((p.deletedAt!.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
            };
        });
    }

    // 彻底删除项目（管理员或系统调用）
    async permanentDelete(id: string, userId: string, isAdmin: boolean = false) {
        const project = await prisma.project.findUnique({ where: { id } });

        if (!project) return null;
        if (!isAdmin && project.userId !== userId) return null;

        // 使用事务彻底删除
        await prisma.$transaction(async (tx) => {
            // 1. 将资源标记为孤立（准备清理）
            await tx.assetRegistry.updateMany({
                where: { projectId: id, status: 'TRASHED' },
                data: {
                    status: 'ARCHIVED',
                    projectId: null,
                    deletedAt: new Date(),
                    deletedBy: 'cascade'
                }
            });

            // 2. 删除 AgentSession
            await tx.agentSession.deleteMany({
                where: { projectId: id }
            });

            // 3. 删除幻灯片
            await tx.slide.deleteMany({
                where: { projectId: id }
            });

            // 4. 删除快照
            await tx.projectSnapshot.deleteMany({
                where: { projectId: id }
            });

            // 5. 删除项目
            await tx.project.delete({
                where: { id }
            });

            // 6. 记录操作日志
            await tx.auditLog.create({
                data: {
                    userId,
                    type: 'PROJECT_PERMANENT_DELETE',
                    content: id,
                    reason: `title: ${project.title}`,
                    severity: 'WARNING'
                }
            });
        });

        return project;
    }
}

export const projectService = new ProjectService();
