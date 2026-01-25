// server/src/routes/points.routes.ts
// 积分路由

import { Router } from 'express';
import * as PointsController from '../controllers/points.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 公开接口：获取积分规则
router.get('/rules', PointsController.getRules);

// 需要登录的接口
router.use(authenticate);

// 获取积分余额
router.get('/balance', PointsController.getBalance);

// 获取交易历史
router.get('/transactions', PointsController.getTransactions);

// 检查操作所需积分
router.get('/check/:actionCode', PointsController.checkAction);

export default router;
