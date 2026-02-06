import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { RefundService } from '../src/services/refund.service';

const prisma = new PrismaClient();
let refundService: RefundService;

describe('Refund Service Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    refundService = new RefundService();

    await prisma.$transaction([
      prisma.benefitRevokeLog.deleteMany({ where: { refundRequest: { userId: 'test-refund-user' } } }),
      prisma.refundRetryLog.deleteMany({ where: { refundRequest: { userId: 'test-refund-user' } } }),
      prisma.refundRequest.deleteMany({ where: { userId: 'test-refund-user' } }),
      prisma.userRefundStats.deleteMany({ where: { userId: 'test-refund-user' } }),
      prisma.project.deleteMany({ where: { userId: 'test-refund-user' } }),
      prisma.task.deleteMany({ where: { userId: 'test-refund-user' } }),
      prisma.order.deleteMany({ where: { userId: 'test-refund-user' } }),
      prisma.user.deleteMany({ where: { id: 'test-refund-user' } }),
    ]);

    testUser = await prisma.user.create({
      data: {
        id: 'test-refund-user',
        email: 'test-refund@example.com',
        password: 'hashedpassword',
        name: 'Test Refund User',
        credits: 1000,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Eligibility Check', () => {
    beforeEach(async () => {
      await prisma.order.deleteMany({ where: { userId: 'test-refund-user' } });
    });

    it('should allow refund for eligible paid order within 7 days', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      const result = await refundService.checkRefundEligibility(testUser.id, order.id);

      expect(result.eligible).toBe(true);
      expect(result.amount).toBe(100);
      expect(result.policy.maxDays).toBe(7);
    });

    it('should reject refund if order is not paid', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PENDING',
          creditsGranted: 0,
          description: 'Test order',
        },
      });

      const result = await refundService.checkRefundEligibility(testUser.id, order.id);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('订单状态');
    });

    it('should reject refund if order is older than 7 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: oldDate,
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      const result = await refundService.checkRefundEligibility(testUser.id, order.id);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('超过');
    });

    it('should reject refund if user has created projects', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      await prisma.project.create({
        data: {
          userId: testUser.id,
          name: 'Test Project',
          description: 'Test',
          status: 'active',
        },
      });

      const result = await refundService.checkRefundEligibility(testUser.id, order.id);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('已创建项目');

      await prisma.project.deleteMany({ where: { userId: testUser.id } });
    });

    it('should reject refund if user has generated PPTs', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      await prisma.task.create({
        data: {
          userId: testUser.id,
          name: 'Test Task',
          description: 'Test',
          status: 'completed',
          pptUrl: 'https://example.com/test.pptx',
        },
      });

      const result = await refundService.checkRefundEligibility(testUser.id, order.id);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('已生成PPT');

      await prisma.task.deleteMany({ where: { userId: testUser.id } });
    });
  });

  describe('Refund Application', () => {
    beforeEach(async () => {
      await prisma.refundRequest.deleteMany({ where: { userId: 'test-refund-user' } });
      await prisma.order.deleteMany({ where: { userId: 'test-refund-user' } });
    });

    it('should successfully create refund request for eligible order', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      const result = await refundService.applyRefund(testUser.id, order.id, 'Test reason');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.amount).toBe(100);
      expect(result.data?.status).toBe('PENDING');
    });

    it('should fail to create duplicate refund request', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      await refundService.applyRefund(testUser.id, order.id, 'First reason');

      const result = await refundService.applyRefund(testUser.id, order.id, 'Second reason');

      expect(result.success).toBe(false);
      expect(result.message).toContain('已存在');
    });
  });

  describe('Admin Audit', () => {
    beforeEach(async () => {
      await prisma.refundRequest.deleteMany({ where: { userId: 'test-refund-user' } });
      await prisma.order.deleteMany({ where: { userId: 'test-refund-user' } });
    });

    it('should approve refund and process payment', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      const refund = await refundService.applyRefund(testUser.id, order.id, 'Test reason');

      const result = await refundService.auditRefund(
        refund.data!.id,
        'APPROVED',
        'Admin note'
      );

      expect(result.success).toBe(true);

      const updatedRefund = await prisma.refundRequest.findUnique({
        where: { id: refund.data!.id },
      });

      expect(updatedRefund?.status).toBe('COMPLETED');
      expect(updatedRefund?.auditNote).toBe('Admin note');
    });

    it('should reject refund and not process payment', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      const refund = await refundService.applyRefund(testUser.id, order.id, 'Test reason');

      const result = await refundService.auditRefund(
        refund.data!.id,
        'REJECTED',
        'Refund policy violation'
      );

      expect(result.success).toBe(true);

      const updatedRefund = await prisma.refundRequest.findUnique({
        where: { id: refund.data!.id },
      });

      expect(updatedRefund?.status).toBe('REJECTED');
      expect(updatedRefund?.auditNote).toBe('Refund policy violation');
    });
  });

  describe('Benefit Revocation', () => {
    beforeEach(async () => {
      await prisma.benefitRevokeLog.deleteMany({ where: { refundRequest: { userId: 'test-refund-user' } } });
      await prisma.refundRequest.deleteMany({ where: { userId: 'test-refund-user' } });
      await prisma.order.deleteMany({ where: { userId: 'test-refund-user' } });
    });

    it('should revoke granted credits on refund completion', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { credits: 2000 },
      });

      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNo: `TEST-${Date.now()}`,
          amount: 100,
          status: 'PAID',
          paidAt: new Date(),
          creditsGranted: 1000,
          description: 'Test order',
        },
      });

      const refund = await refundService.applyRefund(testUser.id, order.id, 'Test reason');
      await refundService.auditRefund(refund.data!.id, 'APPROVED', '');

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });

      expect(user?.credits).toBe(1000);

      const revokeLog = await prisma.benefitRevokeLog.findFirst({
        where: { refundRequestId: refund.data!.id },
      });

      expect(revokeLog).toBeDefined();
      expect(revokeLog?.creditsRevoked).toBe(1000);
    });
  });
});

describe('Refund Stats & Risk Scoring', () => {
  beforeAll(async () => {
    await prisma.userRefundStats.deleteMany({ where: { userId: 'test-refund-user' } });
  });

  it('should track user refund statistics', async () => {
    await prisma.userRefundStats.create({
      data: {
        userId: 'test-refund-user',
        totalRefundCount: 3,
        totalRefundAmount: 300,
        approvedCount: 2,
        rejectedCount: 1,
        riskScore: 45,
      },
    });

    const stats = await prisma.userRefundStats.findUnique({
      where: { userId: 'test-refund-user' },
    });

    expect(stats).toBeDefined();
    expect(stats?.totalRefundCount).toBe(3);
    expect(stats?.riskScore).toBe(45);
  });
});
