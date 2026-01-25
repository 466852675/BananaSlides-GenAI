import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Test123456!', salt);
    await prisma.user.update({
        where: { email: 'testuser@bananaslides.com' },
        data: { passwordHash, loginFailCount: 0, lockedUntil: null }
    });
    console.log('Password reset successfully for testuser@bananaslides.com');
}
main().finally(() => prisma.$disconnect());
