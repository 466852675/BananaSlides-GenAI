import { Router, Request, Response } from 'express';
import { RefundProcessorService } from '../services/refund-processor.service';
import { prisma } from '../db';

const router = Router();

/**
 * 微信支付退款异步通知
 * 
 * 微信 V3 API 通知格式:
 * - 请求头包含签名信息: Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Serial, Wechatpay-Signature
 * - 请求体为 JSON 格式，包含加密的内容
 * 
 * 处理流程:
 * 1. 验证签名 (Wechatpay-Signature)
 * 2. 解密通知内容 (AES-GCM)
 * 3. 更新退款状态
 * 4. 返回 SUCCESS/FAIL 响应
 */
router.post('/wechat/refund', async (req: Request, res: Response) => {
    try {
        console.log('[Webhook] Received WeChat refund notification:', {
            headers: req.headers,
            body: req.body,
        });

        // 获取微信 V3 API 签名相关头部
        const timestamp = req.headers['wechatpay-timestamp'] as string;
        const nonce = req.headers['wechatpay-nonce'] as string;
        const serial = req.headers['wechatpay-serial'] as string;
        const signature = req.headers['wechatpay-signature'] as string;

        // 检查必要参数
        if (!signature) {
            console.error('[Webhook] Missing Wechatpay-Signature header');
            return res.status(400).send(buildWechatResponse('FAIL', 'Missing signature'));
        }

        // 请求体可能是 XML (旧版) 或 JSON (V3 API)
        const notifyData = req.body;
        
        const result = await RefundProcessorService.handleRefundNotify(
            'wechat',
            notifyData,
            signature,
            timestamp,
            nonce,
            serial
        );

        if (result.processed) {
            await updateRefundStatus(result.refundId, result.refundNo, result.status);
            return res.send(buildWechatResponse('SUCCESS', 'OK'));
        } else {
            return res.status(400).send(buildWechatResponse('FAIL', 'Processing failed'));
        }
    } catch (error) {
        console.error('[Webhook] WeChat refund notification error:', error);
        return res.status(500).send(buildWechatResponse('FAIL', 'System error'));
    }
});

/**
 * 构建微信支付响应 XML
 */
function buildWechatResponse(code: string, msg: string): string {
    return `<xml><return_code><![CDATA[${code}]]></return_code><return_msg><![CDATA[${msg}]]></return_msg></xml>`;
}

/**
 * 支付宝退款异步通知
 * 
 * 支付宝通知特点:
 * - 通知数据在请求体中，包含 sign 字段
 * - 需要使用支付宝公钥验证签名 (RSA2)
 * - 处理成功后返回 'success'，失败返回 'fail'
 * 
 * 处理流程:
 * 1. 提取通知数据和签名
 * 2. 验证 RSA2 签名
 * 3. 更新退款状态
 * 4. 返回 success/fail 响应
 */
router.post('/alipay/refund', async (req: Request, res: Response) => {
    try {
        console.log('[Webhook] Received Alipay refund notification:', req.body);

        const notifyData = req.body;
        const signature = notifyData.sign || '';

        if (!signature) {
            console.error('[Webhook] Missing Alipay signature');
            return res.status(400).send('fail');
        }

        const result = await RefundProcessorService.handleRefundNotify(
            'alipay',
            notifyData,
            signature
        );

        if (result.processed) {
            await updateRefundStatus(result.refundId, result.refundNo, result.status);
            return res.send('success');
        } else {
            return res.status(400).send('fail');
        }
    } catch (error) {
        console.error('[Webhook] Alipay refund notification error:', error);
        return res.status(500).send('fail');
    }
});

/**
 * 更新退款状态
 * 
 * 根据支付平台的通知更新本地退款记录状态:
 * - 查找退款记录
 * - 更新状态为已完成 (COMPLETED)
 * - 记录处理时间
 */
async function updateRefundStatus(
    refundId?: string, 
    refundNo?: string,
    status?: string
): Promise<void> {
    try {
        if (!refundId && !refundNo) {
            console.warn('[Webhook] Missing refundId and refundNo');
            return;
        }

        const refund = await prisma.refundRequest.findFirst({
            where: {
                OR: [
                    ...(refundId ? [{ id: refundId }] : []),
                    ...(refundNo ? [{ refundNo }] : []),
                ],
            },
        });

        if (!refund) {
            console.warn('[Webhook] Refund not found:', { refundId, refundNo });
            return;
        }

        // 根据支付平台返回的状态决定本地状态
        const finalStatus = mapPaymentStatusToLocal(status);

        if (refund.status === 'PROCESSING' && finalStatus === 'COMPLETED') {
            await prisma.refundRequest.update({
                where: { id: refund.id },
                data: {
                    status: 'COMPLETED',
                    processedAt: new Date(),
                    completedAt: new Date(),
                },
            });

            console.log('[Webhook] Refund status updated to COMPLETED:', refund.id);
        } else if (finalStatus === 'FAILED') {
            await prisma.refundRequest.update({
                where: { id: refund.id },
                data: {
                    status: 'FAILED',
                    processedAt: new Date(),
                },
            });

            console.log('[Webhook] Refund status updated to FAILED:', refund.id);
        }
    } catch (error) {
        console.error('[Webhook] Failed to update refund status:', error);
    }
}

/**
 * 映射支付平台状态到本地状态
 */
function mapPaymentStatusToLocal(paymentStatus?: string): string {
    if (!paymentStatus) return 'PROCESSING';

    const statusMap: Record<string, string> = {
        'SUCCESS': 'COMPLETED',
        'REFUND_SUCCESS': 'COMPLETED',
        'PROCESSING': 'PROCESSING',
        'REFUND_PROCESSING': 'PROCESSING',
        'FAIL': 'FAILED',
        'REFUND_FAILED': 'FAILED',
        'CHANGE': 'MANUAL_REQUIRED', // 微信转入代发
        'CLOSED': 'REJECTED',
    };

    return statusMap[paymentStatus] || 'PROCESSING';
}

export default router;
