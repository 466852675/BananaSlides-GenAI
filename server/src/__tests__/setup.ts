import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

declare const afterEach: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
declare const beforeAll: (fn: () => void | Promise<void>) => void;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});

function initTestDatabase(): void {
  if (!existsSync('./prisma/test.db')) {
    execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      stdio: 'pipe',
    });
  }
}

export async function cleanupDatabase(): Promise<void> {
  const modelNames = [
    'AgentMessage', 'AgentTask', 'AgentSession',
    'Transaction', 'Slide',
    'User', 'Project', 'Order', 'PointAccount', 'Snapshot', 'Template', 'Role', 'Permission'
  ];

  for (const modelName of modelNames) {
    try {
      await ((prisma as unknown) as Record<string, { deleteMany: () => Promise<void> }>)[modelName.toLowerCase()].deleteMany();
    } catch {}
  }
}

beforeAll(() => {
  initTestDatabase();
});

afterEach(async () => {
  await cleanupDatabase();
});

afterAll(async () => {
  await cleanupDatabase();
  await prisma.$disconnect();
});
