import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class TemplateService {

    // Get all (system + user)
    async findAll() {
        return prisma.styleTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    // Get by ID
    async findById(id: string) {
        return prisma.styleTemplate.findUnique({
            where: { id }
        });
    }

    // Create
    async create(data: Prisma.StyleTemplateCreateInput) {
        return prisma.styleTemplate.create({
            data
        });
    }

    // Update
    async update(id: string, data: Prisma.StyleTemplateUpdateInput) {
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
    async delete(id: string) {
        return prisma.styleTemplate.delete({
            where: { id }
        });
    }
}

export const templateService = new TemplateService();
