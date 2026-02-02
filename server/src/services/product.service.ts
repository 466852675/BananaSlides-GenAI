import { prisma } from '../db';

export const productService = {
    /**
     * listActiveProducts
     * Public API: Get all active products for landing page
     */
    async listActiveProducts() {
        return (await prisma.product.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                createdBy: {
                    select: { nickname: true, avatar: true }
                }
            }
        } as any));
    },

    /**
     * createProduct (Admin)
     */
    async createProduct(data: {
        type: string;
        name: string;
        price: number;
        originalPrice?: number;
        points: number;
        tags?: string[]; // JSON array
        features?: string[]; // JSON array
        roleToGrant?: string; // 购买后授权角色
        discountEnd?: Date;
        sortOrder?: number;
        createdById?: string; // V8.5
        effectiveAt?: Date; // V8.5
        period?: string; // V8.5
    }) {
        const { createdById, effectiveAt, period, ...rest } = data;
        return await prisma.product.create({
            data: {
                ...rest,
                tags: data.tags ? JSON.stringify(data.tags) : undefined,
                features: data.features ? JSON.stringify(data.features) : undefined,
                createdById,
                effectiveAt: effectiveAt || new Date(),
                period: period || 'once'
            } as any
        });
    },

    /**
     * updateProduct (Admin)
     */
    async updateProduct(id: string, data: Partial<{
        name: string;
        price: number;
        originalPrice: number;
        points: number;
        isActive: boolean;
        sortOrder: number;
        tags: string[];
        features: string[];
        roleToGrant: string; // 购买后授权角色
        discountEnd: Date;
        effectiveAt: Date; // V8.5
        period: string; // V8.5
    }>) {
        return await prisma.product.update({
            where: { id },
            data: {
                ...data,
                tags: data.tags ? JSON.stringify(data.tags) : undefined,
                features: data.features ? JSON.stringify(data.features) : undefined
            }
        });
    },

    /**
     * listAllProducts (Admin)
     * Get all products including inactive ones
     */
    async listAllProducts() {
        return (await prisma.product.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
                createdBy: {
                    select: { nickname: true, avatar: true }
                }
            }
        } as any));
    },

    /**
     * deleteProduct (Admin)
     */
    async deleteProduct(id: string) {
        return await prisma.product.delete({ where: { id } });
    }
};
