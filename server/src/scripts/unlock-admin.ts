import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // 重置 admin 账户的锁定状态和登录失败次数
    await prisma.user.updateMany({
        where: {
            OR: [
                { email: 'admin@bananaslides.com' },
                { username: 'admin' }
            ]
        },
        data: {
            loginFailCount: 0,
            lockedUntil: null
        }
    });

    // 同时重置 admin01 和 admin123
    await prisma.user.updateMany({
        where: {
            OR: [
                { email: 'admin01@local' },
                { username: 'admin01' }
            ]
        },
        data: {
            loginFailCount: 0,
            lockedUntil: null
        }
    });

    await prisma.user.updateMany({
        where: {
            OR: [
                { email: 'admin123@bananaslides.com' },
                { username: 'admin123' }
            ]
        },
        data: {
            loginFailCount: 0,
            lockedUntil: null
        }
    });

    console.log('Admin 账户已解锁');

    // 可选：重置密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Test123456!', salt);

    await prisma.user.updateMany({
        where: {
            OR: [
                { email: 'admin@bananaslides.com' },
                { username: 'admin' }
            ]
        },
        data: { passwordHash }
    });

    console.log('Admin 密码已重置为: Test123456!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
