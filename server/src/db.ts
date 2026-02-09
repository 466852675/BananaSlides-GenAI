// server/src/db.ts
// PrismaClient 单例 - 整个应用共享一个数据库连接实例

import { PrismaClient } from '@prisma/client';

// 声明全局变量类型扩展
declare global {
    var prisma: PrismaClient | undefined;
}

// 开发环境下使用全局变量，避免热重载时创建多个实例
export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

// 优雅关闭连接
export async function disconnectDatabase() {
    await prisma.$disconnect();
}

// 连接健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('[Database] Health check failed:', error);
        return false;
    }
}
