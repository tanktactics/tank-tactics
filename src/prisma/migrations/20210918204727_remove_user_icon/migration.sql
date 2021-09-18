/*
  Warnings:

  - You are about to drop the column `icon` on the `Player` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "range" INTEGER NOT NULL,
    "lives" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "coordsId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("coordsId") REFERENCES "Coordinates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("coordsId", "createdAt", "gameId", "id", "kills", "lives", "name", "points", "range", "updatedAt", "userId") SELECT "coordsId", "createdAt", "gameId", "id", "kills", "lives", "name", "points", "range", "updatedAt", "userId" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_coordsId_unique" ON "Player"("coordsId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
