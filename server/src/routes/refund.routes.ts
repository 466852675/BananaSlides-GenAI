import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as RefundService from '../services/refund.service';

const router = Router();

router.use(authenticate);

router.get('/orders/:orderId/eligibility', async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user!.id;

        const result = await RefundService.checkRefundEligibility(userId, orderId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[Refund] 检查退款资格失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.post('/orders/:orderId/apply', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason, description } = req.body;
        const userId = req.user!.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_REASON', message: '请填写退款原因' }
            });
        }

        const result = await RefundService.applyRefund(userId, {
            orderId,
            reason,
            description
        });

        if (result.success) {
            res.json({ success: true, data: result });
        } else {
            res.status(400).json({
                success: false,
                error: { code: result.code, message: result.message }
            });
        }
    } catch (error: any) {
        console.error('[Refund] 申请退款失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.get('/my', async (req, res) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await RefundService.getMyRefunds(userId, { page, limit });
        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[Refund] 获取退款列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.get('/:refundId', async (req, res) => {
    try {
        const { refundId } = req.params;
        const userId = req.user!.id;

        const result = await RefundService.getRefundById(refundId, userId);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: { code: 'REFUND_NOT_FOUND', message: '退款申请不存在' }
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[Refund] 获取退款详情失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

export default router;
