import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class FavoriteService {

    // Get all
    async findAll() {
        return prisma.favorite.findMany({
            include: { template: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Get by ID
    async findById(id: string) {
        return prisma.favorite.findUnique({
            where: { id }
        });
    }

    // Create
    async create(data: Prisma.FavoriteCreateInput) {
        return prisma.favorite.create({
            data
        });
    }

    // Delete
    async delete(id: string) {
        return prisma.favorite.delete({
            where: { id }
        });
    }
}

export const favoriteService = new FavoriteService();
