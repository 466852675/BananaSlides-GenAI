import { Router } from 'express';
import { productService } from '../services/product.service';

const router = Router();

// GET /api/products - 获取所有活跃产品（公开接口）
router.get('/', async (req, res) => {
    try {
        const products = await productService.listActiveProducts();
        res.json(products);
    } catch (error: any) {
        console.error('[ProductRoutes] Error fetching products:', error);
        res.status(500).json({ error: error.message || '获取产品列表失败' });
    }
});

export default router;
