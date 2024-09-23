-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LolSummoner" (
    "puuid" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summonerId" TEXT NOT NULL,
    "alias" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_LolSummoner" ("accountId", "name", "puuid", "summonerId") SELECT "accountId", "name", "puuid", "summonerId" FROM "LolSummoner";
DROP TABLE "LolSummoner";
ALTER TABLE "new_LolSummoner" RENAME TO "LolSummoner";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
