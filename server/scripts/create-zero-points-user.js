const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createZeroPointsUser() {
    const email = 'zeropoints@test.com';
    const password = 'password123';

    // Hash password manually or use a fixed hash for 'password123'
    // $2a$10$YourHashHere... 
    // To be safe, let's use bcrypt if available, otherwise just use a placeholder 
    // and let the user know they might need to use 'forgot password' if login fails 
    // (but usually bcrypt is installed).
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating test user with 0 points...');

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                points: 0,
                role: 'USER', // Enum as string
                status: 'ACTIVE'
            },
            create: {
                email,
                username: 'ZeroPointsUser',
                nickname: '零分测试用户',
                passwordHash: hashedPassword,
                role: 'USER',
                status: 'ACTIVE',
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
