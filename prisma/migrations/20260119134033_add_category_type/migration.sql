/*
  Warnings:

  - Added the required column `type` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('FLAVOUR', 'RECIPE_TYPE', 'PROTEIN');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "type" "CategoryType" NOT NULL;

-- CreateIndex
CREATE INDEX "categories_type_idx" ON "categories"("type");
