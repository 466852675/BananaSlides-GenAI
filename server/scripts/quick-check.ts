import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck() {
    // 查询所有项目的 userId 分布
    const allProjects = await prisma.project.groupBy({
        by: ['userId'],
        _count: true
    });

    console.log('项目 userId 分布:');
    for (const group of allProjects) {
        console.log(`  userId = ${group.userId || 'NULL'}: ${group._count} 个`);
    }

    // 查询所有收藏的 userId 分布
    const allFavorites = await prisma.favorite.groupBy({
        by: ['userId'],
        _count: true
    });

    console.log('\n收藏 userId 分布:');
    for (const group of allFavorites) {
        console.log(`  userId = ${group.userId || 'NULL'}: ${group._count} 个`);
    }

    // 查询测试用户
    const testUsers = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: '466852675' } },
                { phone: { contains: '13294120521' } }
            ]
        },
        select: { id: true, email: true, username: true, role: true }
    });

    console.log('\n测试用户:');
    testUsers.forEach(u => {
        console.log(`  ${u.email || u.username} - ${u.id} (${u.role})`);
    });

    await prisma.$disconnect();
}

quickCheck();
