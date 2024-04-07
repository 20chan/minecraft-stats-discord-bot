/*
  Warnings:

  - The primary key for the `DailyReroll` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyReroll" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'daily',
    "count" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "command" TEXT NOT NULL,

    PRIMARY KEY ("id", "type")
);
INSERT INTO "new_DailyReroll" ("command", "count", "id", "type", "updatedAt") SELECT "command", "count", "id", "type", "updatedAt" FROM "DailyReroll";
DROP TABLE "DailyReroll";
ALTER TABLE "new_DailyReroll" RENAME TO "DailyReroll";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
