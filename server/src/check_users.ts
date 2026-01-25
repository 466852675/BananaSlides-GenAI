import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { OR: [{ email: 'testuser@bananaslides.com' }, { username: 'testuser' }] }
    });
    console.log('--- Test User ---');
    console.log(JSON.stringify(user, null, 2));
}
main().finally(() => prisma.$disconnect());
