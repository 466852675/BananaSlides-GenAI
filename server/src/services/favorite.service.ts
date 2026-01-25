import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class FavoriteService {

    // Get all
    async findAll(userId: string) {
        return prisma.favorite.findMany({
            where: { userId },
            include: { template: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Get by ID
    async findById(id: string, userId: string) {
        const favorite = await prisma.favorite.findUnique({ where: { id } });
        if (!favorite || favorite.userId !== userId) return null;
        return favorite;
    }

    // Create
    async create(userId: string, data: any) {
        return prisma.favorite.create({
            data: {
                ...data,
                userId
            } as any
        });
    }

    // Delete
    async delete(id: string, userId: string) {
        const favorite = await prisma.favorite.findUnique({ where: { id } });
        if (!favorite || favorite.userId !== userId) return null;
        return prisma.favorite.delete({ where: { id } });
    }
}

export const favoriteService = new FavoriteService();
