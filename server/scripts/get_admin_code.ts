import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({ where: { email: 'admin@bananaslides.com' } });
    console.log('ADMIN_INVITE_CODE:', user?.inviteCode);
}
main().finally(() => prisma.$disconnect());
