// server/scripts/create-test-user.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Creating test user...');
    const user = await prisma.user.create({
        data: {
            email: 'admin@banana.com',
            username: 'admin',
            nickname: '管理员',
            role: 'ADMIN',
            points: 1000,
            inviteCode: 'ADMIN123'
        }
    });
    console.log('User created:', user.email);
    await prisma.$disconnect();
}

main();
