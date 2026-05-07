import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding test users...');

    // Default password for all test users: Test123456!
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Test123456!', salt);

    const users = [
        {
            email: 'admin@bananaslides.com',
            username: 'admin',
            nickname: '超级管理员',
            role: UserRole.SUPER_ADMIN,
            points: 999999
        },
        {
            email: 'admin01@local',
            username: 'admin01',
            nickname: '系统管理员',
            role: UserRole.SUPER_ADMIN,
            points: 100000
        },
        {
            email: 'admin123@bananaslides.com',
            username: 'admin123',
            nickname: '业务管理员',
            role: UserRole.ADMIN,
            points: 1000
        },
        {
            email: 'testuser@example.com',
            username: 'user466',
            nickname: '测试用户',
            role: UserRole.USER,
            points: 500
        },
        {
            phone: '13800000000',
            nickname: '手机测试用户',
            role: UserRole.USER,
            points: 100
        }
    ];

    // 清理旧的测试账号和潜在冲突账号 (Cleanup legacy and conflicting accounts)
    const emails = users.map(u => u.email).filter(Boolean);
    const usernames = users.map(u => u.username).filter(Boolean);
    const phones = users.map(u => u.phone).filter(Boolean);

    // 同时也清理之前提到的旧账号
    emails.push('testuser@bananaslides.com', 'superadmin@bananaslides.com', 'admin@local');
    usernames.push('superadmin', 'testuser');

    await prisma.user.deleteMany({
        where: {
            OR: [
                { email: { in: emails as string[] } },
                { username: { in: usernames as string[] } },
                { phone: { in: phones as string[] } }
            ]
        }
    });

    for (const u of users as any[]) {
        await prisma.user.create({
            data: {
                email: u.email,
                phone: u.phone,
                username: u.username,
                nickname: u.nickname,
                passwordHash: passwordHash,
                role: u.role,
                status: UserStatus.ACTIVE,
                points: u.points
            }
        });
        console.log(`Created user: ${u.email || u.phone || u.username} (Role: ${u.role})`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
