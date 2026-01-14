/*
  Warnings:

  - You are about to drop the column `symbol` on the `units` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `units` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `units` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "units_symbol_key";

-- AlterTable
ALTER TABLE "units" DROP COLUMN "symbol",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");
