// 退款流程端到端验证脚本
// 使用模拟模式测试完整退款流程

import { PrismaClient } from '@prisma/client';
import {
    checkRefundEligibility,
    applyRefund,
    checkAutoApprovalEligibility,
} from '../src/services/refund.service';

const prisma = new PrismaClient();

async function cleanup() {
    console.log('🧹 清理测试数据...');
    await prisma.$transaction([
        prisma.benefitRevokeLog.deleteMany({ where: { userId: 'test-user-001' } }),
        prisma.refundRetryLog.deleteMany({ where: { refundId: { startsWith: 'RFD' } } }),
        prisma.refundRequest.deleteMany({ where: { userId: 'test-user-001' } }),
        prisma.userRefundStats.deleteMany({ where: { userId: 'test-user-001' } }),
        prisma.project.deleteMany({ where: { userId: 'test-user-001' } }),
        prisma.order.deleteMany({ where: { userId: 'test-user-001' } }),
        prisma.user.deleteMany({ where: { id: 'test-user-001' } }),
    ]);
}

async function createTestData() {
    console.log('📦 创建测试数据...');

    const now = new Date();
    const accountAge = 45; // 45天前注册（符合自动审批）

    const user = await prisma.user.create({
        data: {
            id: 'test-user-001',
            email: 'test-refund@example.com',
            passwordHash: 'hashedpassword',
            nickname: '测试退款用户',
            points: 1000,
            pointsUsed: 0,
            vipLevel: 0,
            riskScore: 0, // 低风险
            createdAt: new Date(now.getTime() - accountAge * 24 * 60 * 60 * 1000),
        },
    });

    const order = await prisma.order.create({
        data: {
            id: 'test-order-001',
            orderNo: `TEST-ORD-${Date.now()}`,
            userId: user.id,
            productType: 'points',
            productName: '1000积分包',
            productDesc: '购买1000积分',
            quantity: 1000,
            originalPrice: 99.00,
            discountPrice: null,
            finalPrice: 99.00,
            status: 'PAID',
            paymentMethod: 'wechat',
            paymentNo: 'TEST-WX-PAY-123',
            paidAt: new Date(),
        },
    });

    // 创建用户退款统计（无历史记录）
    await prisma.userRefundStats.create({
        data: {
            userId: user.id,
            totalRequests: 0,
            approvedCount: 0,
            rejectedCount: 0,
            riskScore: 0,
        },
    });

    return { user, order };
}

async function testEligibilityCheck(orderId: string) {
    console.log('\n✅ 测试1: 退款资格检查');
    console.log('=' .repeat(50));

    const result = await checkRefundEligibility('test-user-001', orderId);

    console.log('结果:', {
        eligible: result.eligible,
        code: result.code,
        reason: result.reason,
        order: result.order ? {
            orderNo: result.order.orderNo,
            productName: result.order.productName,
            finalPrice: result.order.finalPrice,
        } : null,
    });

    if (!result.eligible) {
        console.error('❌ 退款资格检查失败！');
        return false;
    }

    console.log('✅ 退款资格检查通过');
    return true;
}

async function testAutoApproval(userId: string, amount: number) {
    console.log('\n✅ 测试2: 自动审批资格检查');
    console.log('=' .repeat(50));

    const result = await checkAutoApprovalEligibility(userId, amount);

    console.log('结果:', {
        canAutoApprove: result.canAutoApprove,
        reason: result.reason,
        riskFactors: result.riskFactors,
    });

    return result.canAutoApprove;
}

async function testApplyRefund(orderId: string) {
    console.log('\n✅ 测试3: 提交退款申请');
    console.log('=' .repeat(50));

    const result = await applyRefund('test-user-001', {
        orderId,
        reason: '不需要了',
        description: '临时改变主意，申请退款',
    });

    console.log('结果:', {
        success: result.success,
        code: result.code,
        message: result.message,
        refundId: result.refundId,
        autoApproved: result.autoApproved,
    });

    if (!result.success) {
        console.error('❌ 退款申请提交失败！');
        return false;
    }

    console.log('✅ 退款申请提交成功');
    if (result.autoApproved) {
        console.log('🎉 自动审批已通过！');
    } else {
        console.log('⏳ 需要人工审核');
    }

    return result.refundId;
}

async function verifyRefundStatus(refundId: string) {
    console.log('\n✅ 测试4: 验证退款状态');
    console.log('=' .repeat(50));

    const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: {
            order: {
                select: {
                    orderNo: true,
                    productName: true,
                    finalPrice: true,
                    status: true,
                },
            },
            user: {
                select: {
                    email: true,
                    nickname: true,
                },
            },
        },
    });

    if (!refund) {
        console.error('❌ 退款记录未找到！');
        return false;
    }

    console.log('退款详情:', {
        refundNo: refund.refundNo,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason,
        order: {
            orderNo: refund.order.orderNo,
            productName: refund.order.productName,
            finalPrice: refund.order.finalPrice,
            orderStatus: refund.order.status,
        },
        user: {
            email: refund.user.email,
            nickname: refund.user.nickname,
        },
        createdAt: refund.createdAt,
        processedAt: refund.processedAt,
        completedAt: refund.completedAt,
    });

    const userStats = await prisma.userRefundStats.findUnique({
        where: { userId: refund.userId },
    });

    console.log('用户退款统计:', userStats);

    console.log('✅ 退款状态验证完成');
    return true;
}

async function main() {
    console.log('🚀 开始退款流程端到端验证\n');
    console.log('='.repeat(60));

    try {
        await cleanup();

        const { order } = await createTestData();

        const eligible = await testEligibilityCheck(order.id);
        if (!eligible) {
            process.exit(1);
        }

        const canAutoApprove = await testAutoApproval('test-user-001', order.finalPrice);
        console.log(`自动审批资格: ${canAutoApprove ? '✅ 符合' : '❌ 不符合'}`);

        const refundId = await testApplyRefund(order.id);
        if (!refundId) {
            process.exit(1);
        }

        await verifyRefundStatus(refundId);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 所有测试通过！退款流程验证成功！');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ 验证过程中发生错误:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
