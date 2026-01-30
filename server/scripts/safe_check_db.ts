
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking database connection...");
    try {
        // 1. Check User table count (Proof of Life)
        const userCount = await prisma.user.count();
        console.log(`[SAFE] Connected. Found ${userCount} users.`);

        // 2. Check Permission table columns via raw query (SQLite specific)
        const tableInfo = await prisma.$queryRaw`PRAGMA table_info(Permission);`;
        console.log("[SAFE] Permission Table Structure:", tableInfo);

        // 3. Check existing Permissions
        const permCount = await prisma.permission.count();
        console.log(`[SAFE] Found ${permCount} existing permissions.`);

        // 4. Check Roles
        // @ts-ignore
        const roles = await prisma.user.findMany({ select: { role: true }, take: 1 });
        console.log("[SAFE] Role Enum Sample:", roles);

    } catch (e) {
        console.error("[ERROR] Database check failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
