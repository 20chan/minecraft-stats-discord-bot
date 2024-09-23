/*
  Warnings:

  - Added the required column `summonerId` to the `LolSummoner` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LolSummoner" (
    "puuid" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summonerId" TEXT NOT NULL
);
INSERT INTO "new_LolSummoner" ("accountId", "name", "puuid") SELECT "accountId", "name", "puuid" FROM "LolSummoner";
DROP TABLE "LolSummoner";
ALTER TABLE "new_LolSummoner" RENAME TO "LolSummoner";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
