
import { Router } from 'express';
import * as GrowthController from '../controllers/growth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All growth routes require auth
router.use(authenticate);

router.get('/status', GrowthController.getCheckInStatus);
router.post('/check-in', GrowthController.checkIn);
router.post('/bind-referral', GrowthController.bindReferral);

export default router;
