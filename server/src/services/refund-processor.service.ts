import { RefundStatus, RefundStatusType } from '../types/user.types';
import { prisma } from '../db';
import { WechatPayService, WechatRefundParams } from './payment/wechat.service';
import { AlipayService, AlipayRefundParams } from './payment/alipay.service';

export interface ProcessRefundParams {
    refundId: string;
    userId: string;
    orderId: string;
    orderNo: string;
    refundNo: string;
    amount: number;
    reason: string;
    paymentMethod: 'wechat' | 'alipay';
    paymentNo?: string;
}

export interface ProcessRefundResult {
    success: boolean;
    code: string;
    message: string;
    transactionId?: string;
}

export interface QueryRefundResult {
    success: boolean;
    code: string;
    message: string;
    status?: RefundStatusType;
    transactionId?: string;
}

/**
 * 统一退款处理器
 * 
 * 职责:
 * 1. 根据支付方式路由到对应支付服务
 * 2. 处理支付退款申请
 * 3. 处理退款状态查询
 * 4. 处理支付平台的异步通知
 * 5. 管理退款重试逻辑
 */
export class RefundProcessorService {

    /**
     * 处理退款申请
     * 
     * 流程:
     * 1. 根据支付方式选择对应服务
     * 2. 调用支付平台退款 API
     * 3. 记录退款日志
     * 4. 更新退款状态
     */
    static async processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult> {
        const { 
            refundId, 
            userId, 
            orderId, 
            orderNo, 
            refundNo, 
            amount, 
            reason, 
            paymentMethod,
            paymentNo 
        } = params;

        console.log(`[RefundProcessor] Processing refund ${refundNo} for order ${orderNo}`);

        try {
            let result: ProcessRefundResult;

            if (paymentMethod === 'wechat') {
                result = await this.processWechatRefund({
                    refundId,
                    refundNo,
                    orderNo,
                    amount,
                    reason,
                    paymentNo,
                });
            } else if (paymentMethod === 'alipay') {
                result = await this.processAlipayRefund({
                    refundId,
                    refundNo,
                    orderNo,
                    amount,
                    reason,
                    paymentNo,
                });
            } else {
                return {
                    success: false,
                    code: 'UNSUPPORTED_PAYMENT_METHOD',
                    message: '不支持的支付方式',
                };
            }

            // 记录退款处理日志
            await this.logRefundAttempt(refundId, result);

            return result;

        } catch (error: any) {
            console.error('[RefundProcessor] 处理退款时发生错误:', error);
            
            // 记录失败日志
            await this.logRefundAttempt(refundId, {
                success: false,
                code: 'PROCESSING_ERROR',
                message: error.message || '处理退款时发生未知错误',
            });

            return {
                success: false,
                code: 'PROCESSING_ERROR',
                message: '系统处理退款时发生错误',
            };
        }
    }

    /**
     * 查询退款状态
     */
    static async queryRefundStatus(refundId: string): Promise<QueryRefundResult> {
        const refund = await prisma.refundRequest.findUnique({
            where: { id: refundId },
            include: {
                Order: {
                    select: {
                        paymentMethod: true,
                    },
                },
            },
        });

        if (!refund) {
            return {
                success: false,
                code: 'REFUND_NOT_FOUND',
                message: '退款申请不存在',
            };
        }

        const paymentMethod = refund.Order?.paymentMethod;
        
        if (paymentMethod === 'wechat') {
            const queryResult = await WechatPayService.queryRefundStatus(refund.refundNo);
            
            return {
                success: queryResult.success,
                code: queryResult.code,
                message: queryResult.message,
                status: this.mapWechatStatus(queryResult.status),
                transactionId: queryResult.transactionId,
            };
        } else if (paymentMethod === 'alipay') {
            const queryResult = await AlipayService.queryRefundStatus(refund.refundNo);
            
            return {
                success: queryResult.success,
                code: queryResult.code,
                message: queryResult.message,
                status: this.mapAlipayStatus(queryResult.status),
                transactionId: queryResult.tradeNo,
            };
        }

        return {
            success: false,
            code: 'UNKNOWN_PAYMENT_METHOD',
            message: '无法识别的支付方式',
        };
    }

    /**
     * 处理支付平台的退款通知
     * 
     * 支持微信 V3 API 的签名验证参数:
     * - timestamp: 时间戳
     * - nonce: 随机字符串
     * - serial: 证书序列号
     */
    static async handleRefundNotify(
        paymentMethod: 'wechat' | 'alipay',
        notifyData: Record<string, any>,
        signature: string,
        timestamp?: string,
        nonce?: string,
        serial?: string
    ): Promise<{ processed: boolean; refundNo: string; refundId?: string; status?: string }> {
        console.log(`[RefundProcessor] Received ${paymentMethod} refund notification`);

        try {
            let result: { processed: boolean; refundNo: string; status?: string };

            if (paymentMethod === 'wechat') {
                // 微信 V3 API 需要额外的签名验证参数
                result = await WechatPayService.handleRefundNotify(
                    notifyData, 
                    signature, 
                    timestamp, 
                    nonce, 
                    serial
                );
            } else if (paymentMethod === 'alipay') {
                result = await AlipayService.handleRefundNotify(notifyData, signature);
            } else {
                return { processed: false, refundNo: '' };
            }

            if (result.processed) {
                // 查找对应的退款记录
                const refund = await prisma.refundRequest.findFirst({
                    where: { refundNo: result.refundNo },
                });

                if (refund) {
                    return {
                        processed: true,
                        refundNo: result.refundNo,
                        refundId: refund.id,
                        status: result.status,
                    };
                }
            }

            return { processed: false, refundNo: result.refundNo, status: result.status };

        } catch (error) {
            console.error('[RefundProcessor] 处理退款通知时发生错误:', error);
            return { processed: false, refundNo: notifyData.out_refund_no || notifyData.refundNo || '' };
        }
    }

    /**
     * 重新处理失败的退款（重试机制）
     */
    static async retryRefund(refundId: string): Promise<ProcessRefundResult> {
        const refund = await prisma.refundRequest.findUnique({
            where: { id: refundId },
            include: {
                Order: {
                    select: {
                        orderNo: true,
                        paymentMethod: true,
                        finalPrice: true,
                        paymentNo: true,
                    },
                },
            },
        });

        if (!refund) {
            return {
                success: false,
                code: 'REFUND_NOT_FOUND',
                message: '退款申请不存在',
            };
        }

        if (!refund.Order) {
            return {
                success: false,
                code: 'ORDER_NOT_FOUND',
                message: '关联订单不存在',
            };
        }

        // 检查重试次数
        const retryCount = await prisma.refundRetryLog.count({
            where: { refundId },
        });

        if (retryCount >= 3) {
            return {
                success: false,
                code: 'MAX_RETRY_EXCEEDED',
                message: '已超过最大重试次数，请联系管理员手动处理',
            };
        }

        // 重新处理
        return this.processRefund({
            refundId: refund.id,
            userId: refund.userId,
            orderId: refund.orderId,
            orderNo: refund.Order.orderNo,
            refundNo: refund.refundNo,
            amount: refund.amount,
            reason: refund.reason,
            paymentMethod: refund.Order.paymentMethod as 'wechat' | 'alipay',
            paymentNo: refund.Order.paymentNo || undefined,
        });
    }

    /**
     * 处理微信支付退款
     */
    private static async processWechatRefund(params: {
        refundId: string;
        refundNo: string;
        orderNo: string;
        amount: number;
        reason: string;
        paymentNo?: string;
    }): Promise<ProcessRefundResult> {
        const refundParams: WechatRefundParams = {
            orderNo: params.orderNo,
            refundNo: params.refundNo,
            totalAmount: params.amount,
            refundAmount: params.amount,
            reason: params.reason,
            outTradeNo: params.orderNo,
            transactionId: params.paymentNo,
        };

        const result = await WechatPayService.applyRefund(refundParams);

        return {
            success: result.success,
            code: result.code,
            message: result.message,
            transactionId: result.transactionId,
        };
    }

    /**
     * 处理支付宝退款
     */
    private static async processAlipayRefund(params: {
        refundId: string;
        refundNo: string;
        orderNo: string;
        amount: number;
        reason: string;
        paymentNo?: string;
    }): Promise<ProcessRefundResult> {
        const refundParams: AlipayRefundParams = {
            orderNo: params.orderNo,
            refundNo: params.refundNo,
            totalAmount: params.amount,
            refundAmount: params.amount,
            reason: params.reason,
            outTradeNo: params.orderNo,
            tradeNo: params.paymentNo,
        };

        const result = await AlipayService.applyRefund(refundParams);

        return {
            success: result.success,
            code: result.code,
            message: result.message,
            transactionId: result.tradeNo,
        };
    }

    /**
     * 记录退款尝试日志
     */
    private static async logRefundAttempt(
        refundId: string,
        result: ProcessRefundResult
    ): Promise<void> {
        try {
            const existingLog = await prisma.refundRetryLog.findFirst({
                where: { refundId },
                orderBy: { retryCount: 'desc' }
            });

            const newRetryCount = (existingLog?.retryCount || 0) + 1;

            await prisma.refundRetryLog.create({
                data: {
                    refundId,
                    retryCount: newRetryCount,
                    error: result.success ? null : `${result.code}: ${result.message}`,
                    scheduledAt: new Date(),
                    executedAt: new Date(),
                },
            });

            console.log(`[RefundProcessor] Logged refund attempt #${newRetryCount} for ${refundId}: ${result.success ? 'success' : 'failed'}`);
        } catch (error) {
            console.error('[RefundProcessor] 记录退款日志失败:', error);
        }
    }

    /**
     * 映射微信支付状态到系统状态
     */
    private static mapWechatStatus(status?: string): RefundStatusType | undefined {
        const statusMap: Record<string, RefundStatusType> = {
            SUCCESS: RefundStatus.COMPLETED,
            PROCESSING: RefundStatus.PROCESSING,
            CHANGE: RefundStatus.PROCESSING,
            FAIL: RefundStatus.FAILED,
            CLOSED: RefundStatus.REJECTED,
        };
        return status ? statusMap[status] : undefined;
    }

    /**
     * 映射支付宝状态到系统状态
     */
    private static mapAlipayStatus(status?: string): RefundStatusType | undefined {
        const statusMap: Record<string, RefundStatusType> = {
            REFUND_SUCCESS: RefundStatus.COMPLETED,
            REFUND_PROCESSING: RefundStatus.PROCESSING,
            REFUND_FAILED: RefundStatus.FAILED,
            CLOSED: RefundStatus.REJECTED,
        };
        return status ? statusMap[status] : undefined;
    }
}
