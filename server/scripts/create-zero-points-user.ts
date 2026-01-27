import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createZeroPointsUser() {
    const email = 'zeropoints@test.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating test user with 0 points...');

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                points: 0,
                role: UserRole.USER,
                status: UserStatus.ACTIVE
            },
            create: {
                email,
                username: 'ZeroPointsUser',
                nickname: '零分测试用户',
                passwordHash: hashedPassword,
                role: UserRole.USER,
                status: UserStatus.ACTIVE,
                points: 0
            }
        });

        console.log('✅ User created successfully!');
        console.log('-----------------------------------');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Points:   ${user.points}`);
        console.log(`Role:     ${user.role}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createZeroPointsUser();
