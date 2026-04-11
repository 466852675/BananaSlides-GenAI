import { Prisma } from '@prisma/client';
import { prisma } from '../db';

export class FavoriteService {

    // Helper: Map StyleTemplate relation to frontend-expected field name
    private mapToFrontend(favorite: any) {
        if (!favorite) return null;
        const { StyleTemplate, ...rest } = favorite;
        return {
            ...rest,
            template: StyleTemplate
        };
    }

    // Get all - 支持管理员全局视图
    async findAll(userId: string, isAdmin: boolean = false) {
        const favorites = await prisma.favorite.findMany({
            where: isAdmin ? {} : { userId },
            include: { StyleTemplate: true },
            orderBy: { createdAt: 'desc' }
        });
        // Map StyleTemplate -> template for frontend
        return favorites.map(f => this.mapToFrontend(f));
    }

    // Get by ID
    async findById(id: string, userId: string) {
        const favorite = await prisma.favorite.findUnique({
            where: { id },
            include: { StyleTemplate: true }
        });
        if (!favorite || favorite.userId !== userId) return null;
        return this.mapToFrontend(favorite);
    }

    // Create
    async create(userId: string, data: any) {
        const favorite = await prisma.favorite.create({
            data: {
                ...data,
                userId
            } as any,
            include: { StyleTemplate: true }
        });
        return this.mapToFrontend(favorite);
    }

    // Delete - 管理员可删除任意收藏，普通用户只能删除自己的
    async delete(id: string, userId: string, isAdmin: boolean = false) {
        const favorite = await prisma.favorite.findUnique({ where: { id } });
        if (!favorite) return null;
        // 管理员可删除任意收藏，普通用户只能删除自己的
        if (!isAdmin && favorite.userId !== userId) return null;
        return prisma.favorite.delete({ where: { id } });
    }
}

export const favoriteService = new FavoriteService();
