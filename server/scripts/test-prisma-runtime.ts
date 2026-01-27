
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Prisma Client properties...');

    try {
        // @ts-ignore - Check runtime existence even if types are wrong
        if (prisma.globalConfig) {
            console.log('SUCCESS: prisma.globalConfig exists on client instance.');
        } else {
            console.error('FAILURE: prisma.globalConfig is UNDEFINED.');
        }

        // @ts-ignore
        if (prisma.checkInLog) {
            console.log('SUCCESS: prisma.checkInLog exists.');
        } else {
            console.error('FAILURE: prisma.checkInLog is UNDEFINED.');
        }
    } catch (e) {
        console.error('Error during check:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
