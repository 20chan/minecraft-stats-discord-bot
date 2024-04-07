-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyReroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'daily',
    "count" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "command" TEXT NOT NULL
);
INSERT INTO "new_DailyReroll" ("command", "count", "id", "updatedAt") SELECT "command", "count", "id", "updatedAt" FROM "DailyReroll";
DROP TABLE "DailyReroll";
ALTER TABLE "new_DailyReroll" RENAME TO "DailyReroll";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
