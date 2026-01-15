-- AlterTable
ALTER TABLE "Project" ADD COLUMN "displayId" TEXT;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Slide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "pageType" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "brief" TEXT,
    "variants" TEXT NOT NULL DEFAULT '[]',
    "variantCount" INTEGER NOT NULL DEFAULT 2,
    "previewUrl" TEXT,
    "originalFileRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Slide_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Slide" ("brief", "content", "contentType", "createdAt", "id", "index", "originalFileRef", "pageType", "projectId", "status", "title", "variants") SELECT "brief", "content", "contentType", "createdAt", "id", "index", "originalFileRef", "pageType", "projectId", "status", "title", "variants" FROM "Slide";
DROP TABLE "Slide";
ALTER TABLE "new_Slide" RENAME TO "Slide";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
