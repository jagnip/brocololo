/*
  Warnings:

  - The primary key for the `ingredient_units` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `gramsPerUnit` on the `ingredient_units` table. All the data in the column will be lost.
  - You are about to drop the column `ingredientId` on the `ingredient_units` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `ingredient_units` table. All the data in the column will be lost.
  - You are about to drop the column `ingredientId` on the `recipe_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `recipeId` on the `recipe_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `recipe_ingredients` table. All the data in the column will be lost.
  - Added the required column `grams_per_unit` to the `ingredient_units` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ingredient_id` to the `ingredient_units` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_id` to the `ingredient_units` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ingredient_id` to the `recipe_ingredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipe_id` to the `recipe_ingredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_id` to the `recipe_ingredients` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ingredient_units" DROP CONSTRAINT "ingredient_units_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "ingredient_units" DROP CONSTRAINT "ingredient_units_unitId_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_unitId_fkey";

-- AlterTable
ALTER TABLE "ingredient_units" DROP CONSTRAINT "ingredient_units_pkey",
DROP COLUMN "gramsPerUnit",
DROP COLUMN "ingredientId",
DROP COLUMN "unitId",
ADD COLUMN     "grams_per_unit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "ingredient_id" TEXT NOT NULL,
ADD COLUMN     "unit_id" TEXT NOT NULL,
ADD CONSTRAINT "ingredient_units_pkey" PRIMARY KEY ("ingredient_id", "unit_id");

-- AlterTable
ALTER TABLE "recipe_ingredients" DROP COLUMN "ingredientId",
DROP COLUMN "recipeId",
DROP COLUMN "unitId",
ADD COLUMN     "exclude_from_nutrition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ingredient_id" TEXT NOT NULL,
ADD COLUMN     "recipe_id" TEXT NOT NULL,
ADD COLUMN     "unit_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ingredient_units" ADD CONSTRAINT "ingredient_units_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_units" ADD CONSTRAINT "ingredient_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
