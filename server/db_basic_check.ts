
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Connecting to database...');
        const count = await prisma.order.count();
        console.log('Successfully connected! Order count:', count);

        const firstOrder = await prisma.order.findFirst({
            include: { user: true }
        });
        console.log('Sample order user:', firstOrder?.user?.nickname || 'No User Found');
    } catch (error) {
        console.error('DATABASE CONNECTION FAILED:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
