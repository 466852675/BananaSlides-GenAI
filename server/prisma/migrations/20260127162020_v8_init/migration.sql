/*
  Warnings:

  - You are about to drop the column `deviceId` on the `CheckInLog` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `CheckInLog` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `GlobalConfig` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CheckInLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckInLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CheckInLog" ("createdAt", "date", "id", "points", "streak", "userId") SELECT "createdAt", "date", "id", "points", "streak", "userId" FROM "CheckInLog";
DROP TABLE "CheckInLog";
ALTER TABLE "new_CheckInLog" RENAME TO "CheckInLog";
CREATE INDEX "CheckInLog_createdAt_idx" ON "CheckInLog"("createdAt");
CREATE UNIQUE INDEX "CheckInLog_userId_date_key" ON "CheckInLog"("userId", "date");
CREATE TABLE "new_GlobalConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "desc" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GlobalConfig" ("category", "desc", "key", "updatedAt", "value") SELECT "category", "desc", "key", "updatedAt", "value" FROM "GlobalConfig";
DROP TABLE "GlobalConfig";
ALTER TABLE "new_GlobalConfig" RENAME TO "GlobalConfig";
CREATE TABLE "new_PointsRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "category" TEXT,
    "costPoints" INTEGER NOT NULL,
    "costType" TEXT NOT NULL DEFAULT 'fixed',
    "calculationMethod" TEXT,
    "deductionLogic" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PointsRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PointsRule" ("calculationMethod", "category", "code", "costPoints", "costType", "createdAt", "createdById", "deductionLogic", "description", "effectiveAt", "id", "isActive", "module", "name", "sortOrder", "updatedAt") SELECT "calculationMethod", "category", "code", "costPoints", "costType", "createdAt", "createdById", "deductionLogic", "description", "effectiveAt", "id", "isActive", "module", "name", "sortOrder", "updatedAt" FROM "PointsRule";
DROP TABLE "PointsRule";
ALTER TABLE "new_PointsRule" RENAME TO "PointsRule";
CREATE UNIQUE INDEX "PointsRule_code_key" ON "PointsRule"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
