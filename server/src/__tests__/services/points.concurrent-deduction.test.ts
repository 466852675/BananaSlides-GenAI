import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { prisma } from '../../db';
import { deductPoints, DeductResult } from '../../services/points.service';

describe('积分扣减竞态条件测试', () => {
  let testUser: any;

  beforeEach(async () => {
    // 创建测试用户，初始积分 100
    testUser = await prisma.user.create({
      data: {
        email: `race-test-user-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        points: 100,
        role: 'USER',
      },
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.transaction.deleteMany({
      where: {
        user: { email: { contains: 'race-test-user-' } }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'race-test-user-' }
      }
    });
  });

  it('应该防止并发扣费导致超扣', async () => {
    // 先创建积分规则（60积分/次）
    await prisma.pointsRule.upsert({
      where: { code: 'test_race' },
      update: {},
      create: {
        code: 'test_race',
        name: '并发测试',
        costPoints: 60,
        isActive: true,
      },
    });

    // 模拟两个并发请求同时扣除 60 积分（总共 120，超过用户拥有的 100）
    const deductionPromise1 = deductPoints(
      testUser.id,
      'test_race' as any,
      undefined,
      '测试扣费 1'
    );

    const deductionPromise2 = deductPoints(
      testUser.id,
      'test_race' as any,
      undefined,
      '测试扣费 2'
    );

    const [result1, result2] = await Promise.all([
      deductionPromise1,
      deductionPromise2,
    ]);

    // 重新查询用户余额
    const finalUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { points: true },
    });

    // 关键断言：
    // 1. 最终余额不能为负数
    // 2. 两个请求不能都成功（至少一个失败或扣减受限）
    expect(finalUser!.points).toBeGreaterThanOrEqual(0);
    
    const successCount = [result1, result2].filter(r => r.success).length;
    expect(successCount).toBeLessThanOrEqual(1); // 最多一个成功
    
    // 验证总扣费不超过初始积分
    const totalDeducted = result1.deductedAmount + result2.deductedAmount;
    expect(totalDeducted).toBeLessThanOrEqual(100);
  });

  it('单线程扣费应该正常工作', async () => {
    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        email: `race-test-single-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        points: 100,
        role: 'USER',
      },
    });

    // 创建积分规则
    await prisma.pointsRule.upsert({
      where: { code: 'test_single' },
      update: {},
      create: {
        code: 'test_single',
        name: '单线程测试',
        costPoints: 30,
        isActive: true,
      },
    });

    const result = await deductPoints(
      testUser.id,
      'test_single' as any,
      undefined,
      '单线程测试'
    );

    expect(result.success).toBe(true);
    expect(result.remainingPoints).toBeLessThan(100);
    expect(result.deductedAmount).toBe(30);
  });

  it('应该正确处理余额不足的情况', async () => {
    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        email: `race-test-insufficient-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        points: 50,
        role: 'USER',
      },
    });

    // 创建积分规则（高消耗）
    await prisma.pointsRule.upsert({
      where: { code: 'test_insufficient' },
      update: {},
      create: {
        code: 'test_insufficient',
        name: '余额不足测试',
        costPoints: 200,
        isActive: true,
      },
    });

    const result = await deductPoints(
      testUser.id,
      'test_insufficient' as any,
      undefined,
      '余额不足测试'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('积分不足');
  });

  it('应该能处理零消耗的操作', async () => {
    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        email: `race-test-free-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        points: 100,
        role: 'USER',
      },
    });

    // 创建免费操作规则
    await prisma.pointsRule.upsert({
      where: { code: 'test_free' },
      update: {},
      create: {
        code: 'test_free',
        name: '免费操作测试',
        costPoints: 0,
        isActive: true,
      },
    });

    const result = await deductPoints(
      testUser.id,
      'test_free' as any,
      undefined,
      '免费操作'
    );

    expect(result.success).toBe(true);
    expect(result.deductedAmount).toBe(0);
    expect(result.message).toBe('免费操作');
  });
});
