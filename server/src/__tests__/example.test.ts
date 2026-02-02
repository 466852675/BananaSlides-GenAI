import { testPrisma } from './setup';

declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
};

describe('测试基础设施', () => {
  test('应该能运行基本测试', () => {
    expect(1 + 1).toBe(2);
  });

  test('应该能访问测试数据库', async () => {
    const userCount = await testPrisma.user.count();
    expect(typeof userCount).toBe('number');
    expect(userCount).toBeGreaterThanOrEqual(0);
  });
});
