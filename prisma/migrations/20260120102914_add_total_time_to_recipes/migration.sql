/*
  Warnings:

  - Added the required column `total_time` to the `recipes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "total_time" INTEGER NOT NULL;
