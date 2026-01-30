
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const productService = {
    /**
     * listActiveProducts
     * Public API: Get all active products for landing page
     */
    async listActiveProducts() {
        return await prisma.product.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });
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
    }) {
        return await prisma.product.create({
            data: {
                ...data,
                tags: data.tags ? JSON.stringify(data.tags) : undefined,
                features: data.features ? JSON.stringify(data.features) : undefined
            }
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
     * deleteProduct (Admin)
     */
    async deleteProduct(id: string) {
        return await prisma.product.delete({ where: { id } });
    }
};
