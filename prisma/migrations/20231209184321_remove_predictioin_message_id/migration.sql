/*
  Warnings:

  - You are about to drop the column `channelId` on the `Prediction` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `Prediction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valueSerialized" TEXT NOT NULL
);
INSERT INTO "new_Prediction" ("createdAt", "ended", "id", "title", "valueSerialized") SELECT "createdAt", "ended", "id", "title", "valueSerialized" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
