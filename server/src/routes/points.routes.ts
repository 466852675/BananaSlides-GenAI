// server/src/routes/points.routes.ts
// 积分路由

import { Router } from 'express';
import * as PointsController from '../controllers/points.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { commercialGuard } from '../middleware/commercialGuard';

const router = Router();

// 公开接口：获取积分规则（不受商业化开关影响）
router.get('/rules', PointsController.getRules);

// 以下接口受商业化开关保护
router.use(commercialGuard('points'));

// 需要登录的接口
router.use(authenticate);

// 获取积分余额
router.get('/balance', PointsController.getBalance);

// 获取交易历史
router.get('/transactions', PointsController.getTransactions);

// 检查操作所需积分
router.get('/check/:actionCode', PointsController.checkAction);

// 扣除积分
router.post('/deduct', PointsController.deductPoints);

export default router;
