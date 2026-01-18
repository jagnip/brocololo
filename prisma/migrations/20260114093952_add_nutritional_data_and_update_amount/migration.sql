/*
  Warnings:

  - You are about to drop the column `nutrition` on the `recipes` table. All the data in the column will be lost.
  - Added the required column `calories` to the `ingredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `carbs` to the `ingredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fats` to the `ingredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proteins` to the `ingredients` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `amount` on the `recipe_ingredients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "calories" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "carbs" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fats" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "proteins" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "recipe_ingredients" DROP COLUMN "amount",
ADD COLUMN     "amount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "nutrition";
