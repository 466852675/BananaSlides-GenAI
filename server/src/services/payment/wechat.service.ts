import { prisma } from '../../db';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// WeChat Pay SDK v3 (动态导入避免 mock 模式下加载)
let Wechatpay: any;
try {
    Wechatpay = require('wechatpay-node-v3');
} catch (e) {
    // SDK 未安装时使用 mock 模式
}

export interface WechatRefundParams {
    orderNo: string;
    refundNo: string;
    totalAmount: number;
    refundAmount: number;
    reason: string;
    outTradeNo: string;
    transactionId?: string;
}

export interface WechatRefundResult {
    success: boolean;
    code: string;
    message: string;
    refundId?: string;
    transactionId?: string;
}

export interface WechatRefundQueryResult {
    success: boolean;
    code: string;
    message: string;
    status?: 'SUCCESS' | 'PROCESSING' | 'CHANGE' | 'FAIL' | 'CLOSED';
    refundId?: string;
    transactionId?: string;
    refundAmount?: number;
}

/**
 * WeChat Pay Refund Service
 * 
 * 支持两种模式:
 * 1. Mock 模式 (开发测试) - isMockMode = true
 * 2. 生产模式 (真实支付) - isMockMode = false，需要配置微信支付参数
 * 
 * 生产环境需要配置的环境变量:
 * - WECHAT_MCH_ID: 商户号
 * - WECHAT_APP_ID: 应用ID
 * - WECHAT_API_KEY: API v3 密钥
 * - WECHAT_CERT_PATH: 商户证书路径 (apiclient_cert.pem)
 * - WECHAT_KEY_PATH: 商户私钥路径 (apiclient_key.pem)
 * - WECHAT_SERIAL_NO: 证书序列号
 */
export class WechatPayService {
    private static isMockMode = process.env.WECHAT_MOCK_MODE !== 'false'; // 默认开启 mock
    private static wechatpayInstance: any = null;

    /**
     * 获取微信支付 SDK 实例 (懒加载)
     */
    private static getWechatpayInstance(): any {
        if (this.wechatpayInstance) {
            return this.wechatpayInstance;
        }

        if (!Wechatpay) {
            throw new Error('wechatpay-node-v3 SDK 未安装，请运行: npm install wechatpay-node-v3');
        }

        const mchId = process.env.WECHAT_MCH_ID;
        const appId = process.env.WECHAT_APP_ID;
        const apiKey = process.env.WECHAT_API_KEY;
        const certPath = process.env.WECHAT_CERT_PATH;
        const keyPath = process.env.WECHAT_KEY_PATH;
        const serialNo = process.env.WECHAT_SERIAL_NO;

        if (!mchId || !appId || !apiKey || !certPath || !keyPath || !serialNo) {
            throw new Error(
                '微信支付配置不完整，请检查以下环境变量:\n' +
                '- WECHAT_MCH_ID (商户号)\n' +
                '- WECHAT_APP_ID (应用ID)\n' +
                '- WECHAT_API_KEY (API v3 密钥)\n' +
                '- WECHAT_CERT_PATH (商户证书路径)\n' +
                '- WECHAT_KEY_PATH (商户私钥路径)\n' +
                '- WECHAT_SERIAL_NO (证书序列号)'
            );
        }

        // 读取证书文件
        const cert = fs.readFileSync(path.resolve(certPath));
        const key = fs.readFileSync(path.resolve(keyPath));

        this.wechatpayInstance = new Wechatpay({
            mchid: mchId,
            appid: appId,
            serial_no: serialNo,
            key: apiKey,
            cert: cert,
            private_key: key,
        });

        return this.wechatpayInstance;
    }

    /**
     * 发起微信退款申请
     * 
     * 微信支付退款流程:
     * 1. 构造退款请求参数
     * 2. 使用 API v3 签名
     * 3. 调用微信退款 API (/v3/refund/domestic/refunds)
     * 4. 处理响应结果
     */
    static async applyRefund(params: WechatRefundParams): Promise<WechatRefundResult> {
        if (this.isMockMode) {
            console.log('[WechatPayService] Mock Mode - Simulating refund for order:', params.orderNo);
            
            // 模拟 API 延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 模拟随机成功（95% 成功率）
            const isSuccess = Math.random() > 0.05;
            
            if (isSuccess) {
                return {
                    success: true,
                    code: 'SUCCESS',
                    message: '退款申请已提交，正在处理中',
                    refundId: `MOCK_WX_${Date.now()}`,
                    transactionId: `MOCK_TXN_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                };
            } else {
                return {
                    success: false,
                    code: 'REFUND_FAIL',
                    message: '退款请求被微信支付拒绝（模拟）',
                };
            }
        }

        // 真实微信 SDK 接入
        return this.realRefundRequest(params);
    }

    /**
     * 查询微信退款状态
     */
    static async queryRefundStatus(refundNo: string): Promise<WechatRefundQueryResult> {
        if (this.isMockMode) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 模拟不同的状态
            const statuses: WechatRefundQueryResult['status'][] = ['SUCCESS', 'PROCESSING', 'PROCESSING'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            return {
                success: true,
                code: 'SUCCESS',
                message: this.getStatusMessage(randomStatus!),
                status: randomStatus,
                refundId: refundNo,
                transactionId: `MOCK_TXN_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                refundAmount: 0,
            };
        }

        return this.realQueryRefund(refundNo);
    }

    /**
     * 处理微信支付退款通知（Webhook）
     * 
     * 微信退款通知处理流程:
     * 1. 验证通知签名 (Wechatpay-Signature)
     * 2. 解密通知内容 (AES-GCM)
     * 3. 解析退款状态
     * 4. 更新本地退款记录
     */
    static async handleRefundNotify(
        notifyData: Record<string, any>,
        signature: string,
        timestamp?: string,
        nonce?: string,
        serial?: string
    ): Promise<{ processed: boolean; refundNo: string; status?: string }> {
        if (this.isMockMode) {
            console.log('[WechatPayService] Mock Mode - Received refund notification:', notifyData);
            
            return {
                processed: true,
                refundNo: notifyData.out_refund_no || notifyData.refundNo,
                status: notifyData.refund_status || 'SUCCESS',
            };
        }

        return this.realProcessNotify(notifyData, signature, timestamp, nonce, serial);
    }

    /**
     * 真实微信退款申请
     */
    private static async realRefundRequest(params: WechatRefundParams): Promise<WechatRefundResult> {
        try {
            const wechatpay = this.getWechatpayInstance();

            const refundData = {
                out_refund_no: params.refundNo,
                out_trade_no: params.outTradeNo,
                reason: params.reason,
                amount: {
                    refund: Math.round(params.refundAmount * 100), // 转换为分
                    total: Math.round(params.totalAmount * 100),
                    currency: 'CNY',
                },
            };

            console.log('[WechatPayService] Calling WeChat Pay refund API:', {
                refundNo: params.refundNo,
                outTradeNo: params.outTradeNo,
                amount: refundData.amount,
            });

            const result = await wechatpay.post('/v3/refund/domestic/refunds', refundData);

            console.log('[WechatPayService] WeChat Pay refund response:', result);

            // 解析响应
            if (result.status === 'PROCESSING' || result.status === 'SUCCESS') {
                return {
                    success: true,
                    code: result.status,
                    message: this.getStatusMessage(result.status),
                    refundId: result.refund_id,
                    transactionId: result.transaction_id,
                };
            } else {
                return {
                    success: false,
                    code: result.status || 'FAIL',
                    message: result.message || '退款申请失败',
                };
            }
        } catch (error: any) {
            console.error('[WechatPayService] Refund request failed:', error);

            // 解析微信错误响应
            const errorCode = error?.response?.data?.code || 'SYSTEM_ERROR';
            const errorMessage = error?.response?.data?.message || '系统错误，请稍后重试';

            return {
                success: false,
                code: errorCode,
                message: errorMessage,
            };
        }
    }

    /**
     * 真实微信退款查询
     */
    private static async realQueryRefund(refundNo: string): Promise<WechatRefundQueryResult> {
        try {
            const wechatpay = this.getWechatpayInstance();

            const result = await wechatpay.get(`/v3/refund/domestic/refunds/${refundNo}`);

            console.log('[WechatPayService] WeChat Pay query response:', result);

            return {
                success: true,
                code: result.status,
                message: this.getStatusMessage(result.status),
                status: result.status,
                refundId: result.refund_id,
                transactionId: result.transaction_id,
                refundAmount: result.amount?.refund ? result.amount.refund / 100 : 0,
            };
        } catch (error: any) {
            console.error('[WechatPayService] Query refund failed:', error);

            return {
                success: false,
                code: error?.response?.data?.code || 'QUERY_ERROR',
                message: error?.response?.data?.message || '查询退款状态失败',
            };
        }
    }

    /**
     * 真实微信退款通知处理
     */
    private static async realProcessNotify(
        notifyData: Record<string, any>,
        signature: string,
        timestamp?: string,
        nonce?: string,
        serial?: string
    ): Promise<{ processed: boolean; refundNo: string; status?: string }> {
        try {
            const wechatpay = this.getWechatpayInstance();
            const apiKey = process.env.WECHAT_API_KEY;

            if (!apiKey) {
                throw new Error('Missing WECHAT_API_KEY for notification decryption');
            }

            // 验证签名
            const signatureValid = await wechatpay.verifySignature({
                signature,
                timestamp: timestamp || notifyData.timestamp,
                nonce: nonce || notifyData.nonce,
                serial: serial || notifyData.serial,
                body: JSON.stringify(notifyData),
            });

            if (!signatureValid) {
                console.error('[WechatPayService] Invalid webhook signature');
                return { processed: false, refundNo: '' };
            }

            // 解密通知内容
            const decrypted = wechatpay.decrypt(notifyData.resource, apiKey);
            const refundData = JSON.parse(decrypted);

            console.log('[WechatPayService] Decrypted refund notification:', refundData);

            return {
                processed: true,
                refundNo: refundData.out_refund_no,
                status: refundData.refund_status,
            };
        } catch (error) {
            console.error('[WechatPayService] Process notify failed:', error);
            return { processed: false, refundNo: '' };
        }
    }

    /**
     * 验证签名（真实环境使用 - 兼容旧版 API）
     */
    private static verifySignature(data: Record<string, any>, signature: string): boolean {
        const apiKey = process.env.WECHAT_API_KEY;
        if (!apiKey) {
            console.error('[WechatPayService] Missing WECHAT_API_KEY');
            return false;
        }

        // 构造签名字符串 (MD5)
        const signString = Object.keys(data)
            .filter(key => key !== 'sign' && data[key] !== undefined)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&') + `&key=${apiKey}`;

        const computedSign = crypto
            .createHash('md5')
            .update(signString)
            .digest('hex')
            .toUpperCase();

        return computedSign === signature;
    }

    /**
     * 生成签名（真实环境使用 - 兼容旧版 API）
     */
    private static generateSignature(params: Record<string, any>): string {
        const apiKey = process.env.WECHAT_API_KEY || 'mock_key';
        
        const signString = Object.keys(params)
            .filter(key => key !== 'sign' && params[key] !== undefined)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&') + `&key=${apiKey}`;

        return crypto
            .createHash('md5')
            .update(signString)
            .digest('hex')
            .toUpperCase();
    }

    private static getStatusMessage(status: string): string {
        const messages: Record<string, string> = {
            SUCCESS: '退款成功',
            PROCESSING: '退款处理中',
            CHANGE: '转入代发',
            FAIL: '退款失败',
            CLOSED: '退款关闭',
        };
        return messages[status] || '未知状态';
    }

    /**
     * 设置 mock 模式
     */
    static setMockMode(enabled: boolean): void {
        this.isMockMode = enabled;
        console.log(`[WechatPayService] Mock mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 获取当前模式
     */
    static isInMockMode(): boolean {
        return this.isMockMode;
    }
}
