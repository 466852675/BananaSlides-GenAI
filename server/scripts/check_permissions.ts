
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 检查 Permission 表状态
    const perms = await prisma.permission.findMany({
        select: { id: true, code: true, module: true, description: true },
        orderBy: { module: 'asc' }
    });

    console.log('=== 权限记录检查 ===');
    console.log(`总记录数: ${perms.length}`);

    // 检查重复的 code
    const codeMap = new Map<string, number>();
    perms.forEach(p => codeMap.set(p.code, (codeMap.get(p.code) || 0) + 1));
    const duplicates = Array.from(codeMap.entries()).filter(([, count]) => count > 1);

    if (duplicates.length > 0) {
        console.log('\n❌ 发现重复的权限 Code:');
        duplicates.forEach(([code, count]) => console.log(`   ‣ ${code} 出现 ${count} 次`));
    } else {
        console.log('\n✔ 无重复 Code');
    }

    // 检查缺少描述的记录
    const missingDesc = perms.filter(p => !p.description || p.description === p.code);
    if (missingDesc.length > 0) {
        console.log('\n⚠️ 缺少有效描述的记录:');
        missingDesc.forEach(p => console.log(`   ‣ ${p.code}: "${p.description || '(空)'}"`));
    } else {
        console.log('\n✔ 所有记录都有描述');
    }

    // 列出所有模块分组
    const modules = [...new Set(perms.map(p => p.module))];
    console.log('\n=== 模块分组 ===');
    modules.forEach(m => {
        const items = perms.filter(p => p.module === m);
        console.log(`${m}: ${items.length} 项`);
    });

    await prisma.$disconnect();
}
main();
