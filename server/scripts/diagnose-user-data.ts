// scripts/diagnose-user-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseUserData() {
    console.log('='.repeat(60));
    console.log('🔍 诊断用户数据隔离问题');
    console.log('='.repeat(60));

    // 查询测试用户
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: '466852675@qq.com' },
                { phone: '13294120521' }
            ]
        },
        select: { id: true, email: true, phone: true, role: true }
    });

    console.log('\n📋 测试用户信息:');
    for (const user of users) {
        console.log(`  - ID: ${user.id}`);
        console.log(`    Email: ${user.email || 'null'}`);
        console.log(`    Phone: ${user.phone || 'null'}`);
        console.log(`    Role: ${user.role}`);
        console.log('');
    }

    if (users.length === 0) {
        console.log('❌ 未找到测试用户！');
        await prisma.$disconnect();
        return;
    }

    // 检查每个用户的数据
    for (const user of users) {
        console.log('='.repeat(60));
        console.log(`检查用户: ${user.email || user.phone}`);
        console.log('='.repeat(60));

        // 检查项目
        const projects = await prisma.project.findMany({
            where: { userId: user.id },
            select: { id: true, title: true, userId: true, createdAt: true }
        });

        console.log(`\n✅ 该用户的项目数量: ${projects.length}`);
        if (projects.length > 0) {
            projects.forEach(p => {
                console.log(`  - ${p.title} (userId: ${p.userId})`);
            });
        }

        // 检查收藏
        const favorites = await prisma.favorite.findMany({
            where: { userId: user.id },
            select: { id: true, name: true, userId: true }
        });

        console.log(`\n✅ 该用户的收藏数量: ${favorites.length}`);
        if (favorites.length > 0) {
            favorites.forEach(f => {
                console.log(`  - ${f.name} (userId: ${f.userId})`);
            });
        }

        console.log('');
    }

    // 检查所有项目的 userId 分布
    console.log('='.repeat(60));
    console.log('📊 所有项目的 userId 分布');
    console.log('='.repeat(60));

    const allProjects = await prisma.project.findMany({
        select: { id: true, title: true, userId: true }
    });

    const userIdGroups = new Map<string, number>();
    allProjects.forEach(p => {
        const key = p.userId || 'null';
        userIdGroups.set(key, (userIdGroups.get(key) || 0) + 1);
    });

    console.log(`\n总项目数: ${allProjects.length}`);
    userIdGroups.forEach((count, userId) => {
        console.log(`  - userId = ${userId}: ${count} 个项目`);
    });

    await prisma.$disconnect();
}

diagnoseUserData();
