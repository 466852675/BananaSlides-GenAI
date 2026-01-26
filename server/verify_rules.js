
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rules = await prisma.pointsRule.findMany({
        where: {
            code: {
                in: ['slide_image', 'vision_analyze', 'smart_refine']
            }
        },
        select: {
            id: true,
            code: true,
            name: true,
            module: true,
            category: true
        }
    });

    console.log('RULES_START');
    console.log(JSON.stringify(rules, null, 2));
    console.log('RULES_END');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
