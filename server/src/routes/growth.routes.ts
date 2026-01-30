
import { Router } from 'express';
import * as GrowthController from '../controllers/growth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All growth routes require auth
router.use(authenticate);

// 签到相关路由 - 匹配前端 /api/growth/checkin/*
router.get('/checkin/status', GrowthController.getCheckInStatus);
router.post('/checkin', GrowthController.checkIn);

// 邀请相关路由
router.post('/referral/bind', GrowthController.bindReferral);

export default router;
