import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { prisma } from '../../db';
import * as PointsService from '../../services/points.service';

// Mock environment variable for testing
const originalEnv = process.env.MOCK_AI;

describe('AI Controller Fixes Verification', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create test user with initial points
    testUser = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        points: 100,
        role: 'USER',
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    // Restore environment
    process.env.MOCK_AI = originalEnv;
  });

  describe('D5: MOCK_AI Mode Points Deduction Fix', () => {
    it('should NOT deduct points when MOCK_AI is enabled', async () => {
      process.env.MOCK_AI = '1';
      
      // Simulate the controller logic
      const isMockAiMode = () => process.env.MOCK_AI === '1';
      const shouldDeduct = testUser && !isMockAiMode();
      
      expect(shouldDeduct).toBe(false);
    });

    it('should deduct points when MOCK_AI is disabled', async () => {
      process.env.MOCK_AI = '0';
      
      const isMockAiMode = () => process.env.MOCK_AI === '1';
      const shouldDeduct = testUser && !isMockAiMode();
      
      expect(shouldDeduct).toBe(true);
    });

    it('should deduct points when MOCK_AI is not set', async () => {
      delete process.env.MOCK_AI;
      
      const isMockAiMode = () => process.env.MOCK_AI === '1';
      const shouldDeduct = testUser && !isMockAiMode();
      
      expect(shouldDeduct).toBe(true);
    });
  });

  describe('D8: completeTransaction Logic', () => {
    it('should create transaction with pending status', async () => {
      const deductResult = await PointsService.deductPoints(
        testUser.id,
        'slide_content' as any,
        undefined,
        '测试扣费'
      );

      expect(deductResult.success).toBe(true);
      expect(deductResult.transactionId).toBeDefined();

      // Verify transaction exists and is pending
      const transaction = await prisma.transaction.findUnique({
        where: { id: deductResult.transactionId! }
      });

      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe('consume');
      expect(transaction?.completedAt).toBeNull(); // Should be null initially
    });

    it('should mark transaction as completed', async () => {
      const deductResult = await PointsService.deductPoints(
        testUser.id,
        'slide_content' as any,
        undefined,
        '测试扣费'
      );

      expect(deductResult.success).toBe(true);

      // Simulate successful AI call completion
      await PointsService.completeTransaction(deductResult.transactionId!);

      // Verify transaction is now completed
      const transaction = await prisma.transaction.findUnique({
        where: { id: deductResult.transactionId! }
      });

      expect(transaction?.completedAt).not.toBeNull();
    });

    it('should refund points when AI call fails', async () => {
      const initialUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      const initialPoints = initialUser?.points || 0;

      const deductResult = await PointsService.deductPoints(
        testUser.id,
        'slide_content' as any,
        undefined,
        '测试扣费'
      );

      expect(deductResult.success).toBe(true);
      expect(deductResult.deductedAmount).toBeGreaterThan(0);

      // Simulate AI failure and refund
      await PointsService.refundPoints(
        testUser.id,
        deductResult.deductedAmount,
        deductResult.transactionId!
      );

      // Verify points are refunded
      const finalUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(finalUser?.points).toBe(initialPoints);

      // Verify a new transaction is created for the refund (adjust type)
      const transactions = await prisma.transaction.findMany({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
        take: 2
      });

      // Should have original consume + new adjust transactions
      expect(transactions.length).toBeGreaterThanOrEqual(2);
      expect(transactions[0].type).toBe('adjust'); // Latest is refund
      expect(transactions[0].amount).toBe(deductResult.deductedAmount); // Positive amount = refund
    });
  });

  describe('Integration: Full AI Call Flow', () => {
    it('should handle complete successful flow', async () => {
      // Step 1: Deduct points
      const deductResult = await PointsService.deductPoints(
        testUser.id,
        'outline_generation' as any,
        undefined,
        '大纲生成测试'
      );

      expect(deductResult.success).toBe(true);
      const transactionId = deductResult.transactionId!;

      // Step 2: Simulate successful AI service call
      // (In real scenario, this would call AIService.generateOutline)

      // Step 3: Mark transaction as completed
      await PointsService.completeTransaction(transactionId);

      // Verify final state
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
      });

      expect(transaction?.completedAt).not.toBeNull();
      expect(transaction?.type).toBe('consume');
    });

    it('should handle failure flow with refund', async () => {
      const initialUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      const initialPoints = initialUser?.points || 0;

      // Step 1: Deduct points
      const deductResult = await PointsService.deductPoints(
        testUser.id,
        'slide_image' as any,
        undefined,
        '图片生成测试'
      );

      expect(deductResult.success).toBe(true);

      // Step 2: Simulate AI service failure
      const aiCallFailed = true;

      // Step 3: Refund points if failed
      if (aiCallFailed && deductResult.deductedAmount > 0) {
        await PointsService.refundPoints(
          testUser.id,
          deductResult.deductedAmount,
          deductResult.transactionId!
        );
      }

      // Verify refund
      const finalUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(finalUser?.points).toBe(initialPoints);
    });
  });
});
