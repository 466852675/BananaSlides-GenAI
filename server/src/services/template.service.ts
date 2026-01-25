import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class TemplateService {

    // Get all (system + user)
    // Get all (system + user) - 支持管理员全局视图
    async findAll(userId: string, isAdmin: boolean = false) {
        return prisma.styleTemplate.findMany({
            where: isAdmin ? {} : {
                OR: [
                    { isOfficial: true },
                    { userId }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Get by ID
    async findById(id: string, userId: string) {
        const template = await prisma.styleTemplate.findUnique({ where: { id } });
        if (!template) return null;
        if ((template as any).isOfficial) return template;
        if (template.userId !== userId) return null;
        return template;
    }

    // Create
    async create(userId: string, data: any) {
        return prisma.styleTemplate.create({
            data: {
                ...data,
                userId
            } as any
        });
    }

    // Update
    async update(id: string, userId: string, data: Prisma.StyleTemplateUpdateInput) {
        const existing = await prisma.styleTemplate.findUnique({ where: { id } });
        if (!existing) return null;
        if (existing.isOfficial) return null;
        if (existing.userId !== userId) return null;

        const result = await prisma.styleTemplate.update({
            where: { id },
            data
        });

        // Sync changes to Favorites if they are linked to this template
        // We only update fields that are shared: name, config, styleMap, sampleImages
        // We construct a partial update object
        const favoriteUpdateData: any = {};
        if (data.name) favoriteUpdateData.name = data.name;
        if (data.config) favoriteUpdateData.config = data.config;
        if (data.styleMap) favoriteUpdateData.styleMap = data.styleMap;


        // Only run update if there are fields to update and it's a valid object
        if (Object.keys(favoriteUpdateData).length > 0) {
            await prisma.favorite.updateMany({
                where: { templateId: id },
                data: favoriteUpdateData
            });
        }

        return result;
    }

    // Delete
    async delete(id: string, userId: string) {
        const existing = await prisma.styleTemplate.findUnique({ where: { id } });
        if (!existing) return null;
        if (existing.isOfficial) return null;
        if (existing.userId !== userId) return null;
        return prisma.styleTemplate.delete({ where: { id } });
    }
}

export const templateService = new TemplateService();
