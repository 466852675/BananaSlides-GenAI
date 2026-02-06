import { describe, it, expect, beforeAll } from 'bun:test';
import { WechatPayService } from '../src/services/payment/wechat.service';
import { AlipayService } from '../src/services/payment/alipay.service';

describe('Payment Services Tests', () => {
  let wechatService: WechatPayService;
  let alipayService: AlipayService;

  beforeAll(() => {
    wechatService = new WechatPayService();
    alipayService = new AlipayService();
  });

  describe('WeChat Pay Service', () => {
    it('should process refund successfully (mock mode)', async () => {
      const result = await wechatService.refund({
        orderNo: 'TEST-ORDER-001',
        refundNo: 'TEST-REFUND-001',
        amount: 100,
        reason: 'Test refund',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.message).toContain('成功');
    });

    it('should handle refund query', async () => {
      const result = await wechatService.queryRefund('TEST-REFUND-001');

      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
    });
  });

  describe('Alipay Service', () => {
    it('should process refund successfully (mock mode)', async () => {
      const result = await alipayService.refund({
        orderNo: 'TEST-ORDER-001',
        refundNo: 'TEST-REFUND-002',
        amount: 100,
        reason: 'Test refund',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.message).toContain('成功');
    });

    it('should handle refund query', async () => {
      const result = await alipayService.queryRefund('TEST-REFUND-002');

      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
    });
  });
});
