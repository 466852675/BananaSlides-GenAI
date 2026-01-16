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
        return prisma.styleTemplate.update({
            where: { id },
            data
        });
    }

    // Delete
    async delete(id: string) {
        return prisma.styleTemplate.delete({
            where: { id }
        });
    }
}

export const templateService = new TemplateService();
