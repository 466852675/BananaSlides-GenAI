// server/src/routes/order.routes.ts
// 订单路由：用户端订单创建、支付模拟、订单查询

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as OrderService from '../services/order.service';

const router = Router();

// 所有订单路由需要登录
router.use(authenticate);

/**
 * POST /orders - 创建订单
 * @body { productId: string }
 */
router.post('/', async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user!.id;

        if (!productId) {
            return res.status(400).json({ error: '缺少商品 ID' });
        }

        const result = await OrderService.createOrder(userId, productId);
        res.json(result);
    } catch (error: any) {
        console.error('[Order] 创建订单失败:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /orders/:id/pay - 模拟支付
 * @body { simulate?: 'success' | 'fail' }
 */
router.post('/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;
        const { simulate = 'success' } = req.body;

        const result = await OrderService.simulatePay(id, simulate);
        res.json(result);
    } catch (error: any) {
        console.error('[Order] 支付失败:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /orders/my - 获取我的订单列表
 * @query page, limit
 */
router.get('/my', async (req, res) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await OrderService.getMyOrders(userId, page, limit);
        res.json(result);
    } catch (error: any) {
        console.error('[Order] 获取订单失败:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
