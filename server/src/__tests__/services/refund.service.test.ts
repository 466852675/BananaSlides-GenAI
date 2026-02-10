import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { RefundStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../setup';
import {
    checkRefundEligibility,
    applyRefund,
    auditRefund,
    getRefundById,
    getMyRefunds,
    listRefunds,
    getRefundStats,
} from '../../services/refund.service';

describe('Refund Service - Unit Tests', () => {
    let testUserId: string;
    let testOrderId: string;
    let testAdminId: string;

    beforeAll(async () => {
        // Create test users
        const testUser = await prisma.user.create({
            data: {
                email: 'test-refund-user@example.com',
                passwordHash: 'hashedpassword',
                nickname: 'Test User',
                role: 'USER',
            },
        });
        testUserId = testUser.id;

        const testAdmin = await prisma.user.create({
            data: {
                email: 'test-admin@example.com',
                passwordHash: 'hashedpassword',
                nickname: 'Test Admin',
                role: 'ADMIN',
            },
        });
        testAdminId = testAdmin.id;
    });

    afterAll(async () => {
        // Cleanup
        await prisma.refundHistory.deleteMany({});
        await prisma.refundRequest.deleteMany({});
        await prisma.order.deleteMany({});
        await prisma.userRefundStats.deleteMany({});
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: ['test-refund-user@example.com', 'test-admin@example.com'],
                },
            },
        });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        // Clean up refunds and orders before each test
        await prisma.refundHistory.deleteMany({});
        await prisma.refundRequest.deleteMany({});
        await prisma.order.deleteMany({ where: { userId: testUserId } });
    });

    describe('checkRefundEligibility', () => {
        it('应该允许未使用用户退款 (within 7 days)', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            const result = await checkRefundEligibility(testUserId, order.id);

            expect(result.eligible).toBe(true);
            expect(result.code).toBe('ELIGIBLE');
            expect(result.order).toBeDefined();
        });

        it('应该拒绝已创建项目的用户退款', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            // Create a project after order
            await prisma.project.create({
                data: {
                    userId: testUserId,
                    title: 'Test Project',
                    status: 'ACTIVE',
                },
            });

            const result = await checkRefundEligibility(testUserId, order.id);

            expect(result.eligible).toBe(false);
            expect(result.code).toBe('SERVICE_ALREADY_USED');
        });

        it('应该拒绝超过7天的订单', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);

            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: oldDate,
                    quantity: 1,
                },
            });

            const result = await checkRefundEligibility(testUserId, order.id);

            expect(result.eligible).toBe(false);
            expect(result.code).toBe('REFUND_PERIOD_EXPIRED');
        });

        it('应该拒绝已有进行中的退款申请', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            // Create existing refund request
            await prisma.refundRequest.create({
                data: {
                    refundNo: `REF-${Date.now()}`,
                    userId: testUserId,
                    orderId: order.id,
                    amount: 100,
                    status: RefundStatus.PENDING,
                    reason: 'Test reason',
                },
            });

            const result = await checkRefundEligibility(testUserId, order.id);

            expect(result.eligible).toBe(false);
            expect(result.code).toBe('REFUND_ALREADY_REQUESTED');
        });

        it('应该拒绝未支付的订单', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PENDING,
                    quantity: 1,
                },
            });

            const result = await checkRefundEligibility(testUserId, order.id);

            expect(result.eligible).toBe(false);
            expect(result.code).toBe('ORDER_NOT_PAID');
        });

        it('应该拒绝高风险用户的退款', async () => {
            await prisma.userRefundStats.create({
                data: {
                    userId: testUserId,
                    totalRequests: 5,
                    rejectedCount: 4,
                    riskScore: 85,
                },
            });

            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            const result = await checkRefundEligibility(testUserId, order.id);

            expect(result.eligible).toBe(false);
            expect(result.code).toBe('USER_REFUND_RISK_HIGH');

            // Cleanup
            await prisma.userRefundStats.delete({ where: { userId: testUserId } });
        });
    });

    describe('applyRefund', () => {
        it('应该成功创建退款申请', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            const result = await applyRefund(testUserId, {
                orderId: order.id,
                reason: 'TEST_REFUND',
                description: 'Test refund description',
            });

            expect(result.success).toBe(true);
            expect(result.refundId).toBeDefined();
            expect(result.code).toBe('REFUND_SUBMITTED');
        });

        it('应该失败当订单不符合退款条件', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PENDING, // Not paid
                    quantity: 1,
                },
            });

            const result = await applyRefund(testUserId, {
                orderId: order.id,
                reason: 'TEST_REFUND',
            });

            expect(result.success).toBe(false);
            expect(result.code).toBe('ORDER_NOT_PAID');
        });
    });

    describe('auditRefund', () => {
        it('应该成功通过退款申请', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            const refundResult = await applyRefund(testUserId, {
                orderId: order.id,
                reason: 'TEST_REFUND',
            });

            const auditResult = await auditRefund(refundResult.refundId!, testAdminId, {
                approved: true,
                remark: 'Approved by admin',
            });

            expect(auditResult.success).toBe(true);
            expect(auditResult.code).toBe('REFUND_APPROVED');

            // Verify refund status
            const refund = await prisma.refundRequest.findUnique({
                where: { id: refundResult.refundId },
            });
            expect(refund?.status).toBe(RefundStatus.PROCESSING);
        });

        it('应该成功拒绝退款申请', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            const refundResult = await applyRefund(testUserId, {
                orderId: order.id,
                reason: 'TEST_REFUND',
            });

            const auditResult = await auditRefund(refundResult.refundId!, testAdminId, {
                approved: false,
                remark: 'Rejected by admin',
            });

            expect(auditResult.success).toBe(true);
            expect(auditResult.code).toBe('REFUND_REJECTED');

            // Verify refund status
            const refund = await prisma.refundRequest.findUnique({
                where: { id: refundResult.refundId },
            });
            expect(refund?.status).toBe(RefundStatus.REJECTED);
        });
    });

    describe('getMyRefunds', () => {
        it('应该返回用户的退款列表', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            await applyRefund(testUserId, {
                orderId: order.id,
                reason: 'TEST_REFUND',
            });

            const result = await getMyRefunds(testUserId, { page: 1, limit: 10 });

            expect(result.items.length).toBeGreaterThan(0);
            expect(result.pagination.total).toBeGreaterThan(0);
        });
    });

    describe('getAdminRefunds', () => {
        it('应该返回管理员退款列表', async () => {
            const result = await getAdminRefunds({ page: 1, limit: 10 });

            expect(result.items).toBeDefined();
            expect(result.pagination).toBeDefined();
        });

        it('应该支持按状态筛选', async () => {
            const order = await prisma.order.create({
                data: {
                    orderNo: `TEST-${Date.now()}`,
                    userId: testUserId,
                    productType: 'credits',
                    productName: '测试积分包',
                    originalPrice: 100,
                    finalPrice: 100,
                    status: OrderStatus.PAID,
                    paidAt: new Date(),
                    quantity: 1,
                },
            });

            await applyRefund(testUserId, {
                orderId: order.id,
                reason: 'TEST_REFUND',
            });

            const result = await getAdminRefunds({
                page: 1,
                limit: 10,
                status: RefundStatus.PENDING,
            });

            expect(result.items.length).toBeGreaterThan(0);
        });
    });

    describe('getRefundStats', () => {
        it('应该返回退款统计数据', async () => {
            const stats = await getRefundStats();

            expect(stats).toHaveProperty('totalCount');
            expect(stats).toHaveProperty('pendingCount');
            expect(stats).toHaveProperty('completedCount');
            expect(stats).toHaveProperty('rejectedCount');
            expect(stats).toHaveProperty('totalAmount');
        });
    });
});
