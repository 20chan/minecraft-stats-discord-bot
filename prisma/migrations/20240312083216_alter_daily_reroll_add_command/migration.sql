/*
  Warnings:

  - Added the required column `command` to the `DailyReroll` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyReroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "command" TEXT NOT NULL
);
INSERT INTO "new_DailyReroll" ("count", "id", "updatedAt") SELECT "count", "id", "updatedAt" FROM "DailyReroll";
DROP TABLE "DailyReroll";
ALTER TABLE "new_DailyReroll" RENAME TO "DailyReroll";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
