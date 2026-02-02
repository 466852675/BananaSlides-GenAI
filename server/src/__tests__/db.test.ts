import { describe, it, expect } from 'bun:test';
import { prisma } from '../db';

describe('PrismaClient 单例模式', () => {
  it('应该导出单例 prisma 实例', () => {
    expect(prisma).toBeDefined();
    expect(prisma).toBeInstanceOf(Object);
  });

  it('多次导入应该返回同一实例', async () => {
    const { prisma: prisma1 } = await import('../db');
    const { prisma: prisma2 } = await import('../db');
    expect(prisma1).toBe(prisma2);
  });

  it('应该能执行基本查询', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
