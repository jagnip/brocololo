-- CreateEnum
CREATE TYPE "RecipeIngredientAdjustmentKind" AS ENUM ('MODIFY', 'SKIP');

-- CreateTable
CREATE TABLE "recipe_ingredient_member_adjustments" (
    "id" TEXT NOT NULL,
    "recipe_ingredient_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "kind" "RecipeIngredientAdjustmentKind" NOT NULL,
    "ingredient_id" TEXT,
    "amount" DOUBLE PRECISION,
    "unit_id" TEXT,
    "additional_info" TEXT,

    CONSTRAINT "recipe_ingredient_member_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_ingredient_member_adjustments_family_member_id_idx" ON "recipe_ingredient_member_adjustments"("family_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredient_member_adjustments_recipe_ingredient_id_f_key" ON "recipe_ingredient_member_adjustments"("recipe_ingredient_id", "family_member_id");

-- AddForeignKey
ALTER TABLE "recipe_ingredient_member_adjustments" ADD CONSTRAINT "recipe_ingredient_member_adjustments_recipe_ingredient_id_fkey" FOREIGN KEY ("recipe_ingredient_id") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient_member_adjustments" ADD CONSTRAINT "recipe_ingredient_member_adjustments_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient_member_adjustments" ADD CONSTRAINT "recipe_ingredient_member_adjustments_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient_member_adjustments" ADD CONSTRAINT "recipe_ingredient_member_adjustments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
