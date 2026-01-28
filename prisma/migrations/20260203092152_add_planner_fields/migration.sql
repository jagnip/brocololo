/*
  Warnings:

  - Made the column `serving_multiplier_for_nelson` on table `recipes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "exclude_from_planner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_used_in_planner" TIMESTAMP(3),
ALTER COLUMN "serving_multiplier_for_nelson" SET NOT NULL,
ALTER COLUMN "serving_multiplier_for_nelson" SET DEFAULT 1;
