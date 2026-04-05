// server/src/routes/auth.routes.ts
// 认证路由

import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// 公开接口（无需登录）
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/send-code', AuthController.sendPhoneCode);
router.post('/login-phone', AuthController.loginWithPhone);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Token 刷新接口（需要有效的 token）
router.post('/refresh', authenticate, AuthController.refreshToken);

// 需要登录的接口
router.get('/me', authenticate, AuthController.me);
router.put('/me', authenticate, AuthController.updateProfile);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;
