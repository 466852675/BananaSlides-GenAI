// src/api/product.ts
import { client } from './client';

export interface Product {
    id: string;
    type: 'VIP_MONTHLY' | 'POINTS_PACK';
    name: string;
    price: number;
    originalPrice?: number;
    points: number;
    tags?: string[]; // Parsed from JSON
    features?: string[]; // Parsed from JSON
    discountEnd?: string;
    isActive: boolean;
}

/**
 * 获取公开上架的商品列表
 */
export async function getProducts(): Promise<Product[]> {
    const res: any = await client.get('/products');
    // Server returns tags/features as JSON strings usually, but frontend wants arrays
    const products = Array.isArray(res) ? res : [];
    return products.map((p: any) => ({
        ...p,
        tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
}

/**
 * 获取特定商品详情
 */
export async function getProduct(id: string): Promise<Product> {
    const res: any = await client.get(`/products/${id}`);
    const p = res;
    if (!p) throw new Error('Product not found');
    return {
        ...p,
        tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    };
}
