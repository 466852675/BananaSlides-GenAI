import { prisma } from '../../db';
import * as crypto from 'crypto';

// Alipay SDK (动态导入避免 mock 模式下加载)
let AlipaySdk: any;
try {
    AlipaySdk = require('alipay-sdk').default;
} catch (e) {
    // SDK 未安装时使用 mock 模式
}

export interface AlipayRefundParams {
    orderNo: string;
    refundNo: string;
    totalAmount: number;
    refundAmount: number;
    reason: string;
    outTradeNo: string;
    tradeNo?: string;
}

export interface AlipayRefundResult {
    success: boolean;
    code: string;
    message: string;
    refundId?: string;
    tradeNo?: string;
    refundFee?: number;
}

export interface AlipayRefundQueryResult {
    success: boolean;
    code: string;
    message: string;
    status?: 'REFUND_SUCCESS' | 'REFUND_PROCESSING' | 'REFUND_FAILED' | 'CLOSED';
    refundId?: string;
    tradeNo?: string;
    refundAmount?: number;
    gmtRefundPay?: string;
}

/**
 * Alipay Refund Service
 * 
 * 支持两种模式:
 * 1. Mock 模式 (开发测试) - isMockMode = true
 * 2. 生产模式 (真实支付) - isMockMode = false，需要配置支付宝参数
 * 
 * 生产环境需要配置的环境变量:
 * - ALIPAY_APP_ID: 支付宝应用ID
 * - ALIPAY_PRIVATE_KEY: 应用私钥 (RSA2)
 * - ALIPAY_PUBLIC_KEY: 支付宝公钥
 * - ALIPAY_GATEWAY: 支付宝网关 (沙箱或生产)
 * - ALIPAY_ENCRYPT_KEY: (可选) AES 加密密钥
 */
export class AlipayService {
    private static isMockMode = process.env.ALIPAY_MOCK_MODE !== 'false'; // 默认开启 mock
    private static alipaySdkInstance: any = null;

    /**
     * 获取支付宝 SDK 实例 (懒加载)
     */
    private static getAlipaySdkInstance(): any {
        if (this.alipaySdkInstance) {
            return this.alipaySdkInstance;
        }

        if (!AlipaySdk) {
            throw new Error('alipay-sdk 未安装，请运行: npm install alipay-sdk');
        }

        const appId = process.env.ALIPAY_APP_ID;
        const privateKey = process.env.ALIPAY_PRIVATE_KEY;
        const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
        const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
        const encryptKey = process.env.ALIPAY_ENCRYPT_KEY;

        if (!appId || !privateKey || !alipayPublicKey) {
            throw new Error(
                '支付宝配置不完整，请检查以下环境变量:\n' +
                '- ALIPAY_APP_ID (应用ID)\n' +
                '- ALIPAY_PRIVATE_KEY (应用私钥)\n' +
                '- ALIPAY_PUBLIC_KEY (支付宝公钥)\n' +
                '- ALIPAY_GATEWAY (网关地址，可选，默认生产环境)\n' +
                '- ALIPAY_ENCRYPT_KEY (AES密钥，可选)'
            );
        }

        this.alipaySdkInstance = new AlipaySdk({
            appId,
            privateKey,
            alipayPublicKey,
            gateway,
            encryptKey,
            signType: 'RSA2',
            charset: 'utf-8',
            version: '1.0',
        });

        return this.alipaySdkInstance;
    }

    /**
     * 发起支付宝退款申请
     * 
     * 支付宝退款流程:
     * 1. 构造退款请求参数
     * 2. 使用 RSA2 签名
     * 3. 调用 alipay.trade.refund API
     * 4. 处理同步响应
     */
    static async applyRefund(params: AlipayRefundParams): Promise<AlipayRefundResult> {
        if (this.isMockMode) {
            console.log('[AlipayService] Mock Mode - Simulating refund for order:', params.orderNo);
            
            // 模拟 API 延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 模拟随机成功（97% 成功率）
            const isSuccess = Math.random() > 0.03;
            
            if (isSuccess) {
                return {
                    success: true,
                    code: '10000',
                    message: '退款申请已提交',
                    refundId: `MOCK_ALI_${Date.now()}`,
                    tradeNo: `MOCK_TRADE_${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
                    refundFee: params.refundAmount,
                };
            } else {
                return {
                    success: false,
                    code: '40004',
                    message: '退款失败：余额不足或订单状态异常（模拟）',
                };
            }
        }

        // 真实支付宝 SDK 接入
        return this.realRefundRequest(params);
    }

    /**
     * 查询支付宝退款状态
     */
    static async queryRefundStatus(refundNo: string): Promise<AlipayRefundQueryResult> {
        if (this.isMockMode) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 模拟不同的状态
            const statuses: AlipayRefundQueryResult['status'][] = [
                'REFUND_SUCCESS',
                'REFUND_PROCESSING',
                'REFUND_PROCESSING',
            ];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            return {
                success: true,
                code: '10000',
                message: this.getStatusMessage(randomStatus!),
                status: randomStatus,
                refundId: refundNo,
                tradeNo: `MOCK_TRADE_${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
                refundAmount: 0,
                gmtRefundPay: randomStatus === 'REFUND_SUCCESS' ? new Date().toISOString() : undefined,
            };
        }

        return this.realQueryRefund(refundNo);
    }

    /**
     * 处理支付宝退款异步通知（Webhook）
     * 
     * 支付宝退款通知处理流程:
     * 1. 验证通知签名 (RSA2)
     * 2. 解析通知内容
     * 3. 更新本地退款记录
     */
    static async handleRefundNotify(
        notifyData: Record<string, any>,
        signature: string
    ): Promise<{ processed: boolean; refundNo: string; status?: string }> {
        if (this.isMockMode) {
            console.log('[AlipayService] Mock Mode - Received refund notification:', notifyData);
            
            return {
                processed: true,
                refundNo: notifyData.out_request_no || notifyData.refundNo,
                status: notifyData.refund_status || 'REFUND_SUCCESS',
            };
        }

        return this.realProcessNotify(notifyData, signature);
    }

    /**
     * 真实支付宝退款申请
     */
    private static async realRefundRequest(params: AlipayRefundParams): Promise<AlipayRefundResult> {
        try {
            const alipaySdk = this.getAlipaySdkInstance();

            const refundData = {
                out_trade_no: params.outTradeNo,
                trade_no: params.tradeNo,
                refund_amount: params.refundAmount.toFixed(2),
                out_request_no: params.refundNo,
                refund_reason: params.reason,
            };

            console.log('[AlipayService] Calling Alipay refund API:', {
                refundNo: params.refundNo,
                outTradeNo: params.outTradeNo,
                amount: refundData.refund_amount,
            });

            const result = await alipaySdk.exec('alipay.trade.refund', refundData);

            console.log('[AlipayService] Alipay refund response:', result);

            // 解析响应
            if (result.code === '10000') {
                return {
                    success: true,
                    code: result.code,
                    message: result.msg || '退款申请已提交',
                    refundId: params.refundNo,
                    tradeNo: result.trade_no,
                    refundFee: parseFloat(result.refund_fee || '0'),
                };
            } else {
                return {
                    success: false,
                    code: result.code || 'UNKNOWN_ERROR',
                    message: result.msg || result.sub_msg || '退款申请失败',
                };
            }
        } catch (error: any) {
            console.error('[AlipayService] Refund request failed:', error);

            return {
                success: false,
                code: error?.code || 'SYSTEM_ERROR',
                message: error?.message || '系统错误，请稍后重试',
            };
        }
    }

    /**
     * 真实支付宝退款查询
     */
    private static async realQueryRefund(refundNo: string): Promise<AlipayRefundQueryResult> {
        try {
            const alipaySdk = this.getAlipaySdkInstance();

            const queryData = {
                out_request_no: refundNo,
            };

            const result = await alipaySdk.exec('alipay.trade.fastpay.refund.query', queryData);

            console.log('[AlipayService] Alipay query response:', result);

            // 支付宝查询接口返回的是退款详情列表
            if (result.code === '10000' && result.refund_detail_item_list) {
                const refundDetail = result.refund_detail_item_list[0];
                const status = this.mapAlipayStatus(refundDetail?.refund_status);

                return {
                    success: true,
                    code: result.code,
                    message: this.getStatusMessage(status),
                    status: status as AlipayRefundQueryResult['status'],
                    refundId: refundNo,
                    tradeNo: result.trade_no,
                    refundAmount: parseFloat(refundDetail?.refund_amount || '0'),
                    gmtRefundPay: refundDetail?.gmt_refund_pay,
                };
            } else {
                return {
                    success: false,
                    code: result.code || 'QUERY_EMPTY',
                    message: result.msg || '未找到退款记录',
                };
            }
        } catch (error: any) {
            console.error('[AlipayService] Query refund failed:', error);

            return {
                success: false,
                code: error?.code || 'QUERY_ERROR',
                message: error?.message || '查询退款状态失败',
            };
        }
    }

    /**
     * 真实支付宝退款通知处理
     */
    private static async realProcessNotify(
        notifyData: Record<string, any>,
        signature: string
    ): Promise<{ processed: boolean; refundNo: string; status?: string }> {
        try {
            const alipaySdk = this.getAlipaySdkInstance();

            // 验证签名
            const signValid = alipaySdk.checkNotifySign(notifyData);

            if (!signValid) {
                console.error('[AlipayService] Invalid webhook signature');
                return { processed: false, refundNo: '' };
            }

            console.log('[AlipayService] Valid refund notification:', notifyData);

            // 解析通知数据
            const refundNo = notifyData.out_request_no || notifyData.out_biz_no;
            const status = this.mapAlipayStatus(notifyData.refund_status);

            return {
                processed: true,
                refundNo,
                status,
            };
        } catch (error) {
            console.error('[AlipayService] Process notify failed:', error);
            return { processed: false, refundNo: '' };
        }
    }

    /**
     * 映射支付宝退款状态到统一状态
     */
    private static mapAlipayStatus(alipayStatus: string): string {
        const statusMap: Record<string, string> = {
            'REFUND_SUCCESS': 'REFUND_SUCCESS',
            'REFUND_PROCESSING': 'REFUND_PROCESSING',
            'REFUND_FAILED': 'REFUND_FAILED',
            'CLOSED': 'CLOSED',
            'SUCCESS': 'REFUND_SUCCESS', // 部分接口使用不同的状态名
        };
        return statusMap[alipayStatus] || alipayStatus || 'UNKNOWN';
    }

    /**
     * 验证支付宝签名（真实环境使用）
     */
    private static verifySignature(data: Record<string, any>, signature: string): boolean {
        const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
        if (!alipayPublicKey) {
            console.error('[AlipayService] Missing ALIPAY_PUBLIC_KEY');
            return false;
        }

        try {
            const signContent = Object.keys(data)
                .filter(key => key !== 'sign' && key !== 'sign_type' && data[key] !== undefined)
                .sort()
                .map(key => `${key}=${data[key]}`)
                .join('&');

            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signContent, 'utf8');
            
            return verifier.verify(alipayPublicKey, signature, 'base64');
        } catch (error) {
            console.error('[AlipayService] Signature verification failed:', error);
            return false;
        }
    }

    /**
     * 生成支付宝签名（真实环境使用）
     */
    private static generateSignature(params: Record<string, any>): string {
        const privateKey = process.env.ALIPAY_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('Missing ALIPAY_PRIVATE_KEY');
        }

        const signContent = Object.keys(params)
            .filter(key => key !== 'sign' && key !== 'sign_type' && params[key] !== undefined)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signer = crypto.createSign('RSA-SHA256');
        signer.update(signContent, 'utf8');
        
        return signer.sign(privateKey, 'base64');
    }

    private static getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            REFUND_SUCCESS: '退款成功',
            REFUND_PROCESSING: '退款处理中',
            REFUND_FAILED: '退款失败',
            CLOSED: '退款关闭',
        };
        return messages[status] || '未知状态';
    }

    /**
     * 设置 mock 模式
     */
    static setMockMode(enabled: boolean): void {
        this.isMockMode = enabled;
        console.log(`[AlipayService] Mock mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 获取当前模式
     */
    static isInMockMode(): boolean {
        return this.isMockMode;
    }
}
