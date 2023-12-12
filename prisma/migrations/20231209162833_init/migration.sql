-- CreateTable
CREATE TABLE "Money" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "valueSerialized" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "predictionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL
);
