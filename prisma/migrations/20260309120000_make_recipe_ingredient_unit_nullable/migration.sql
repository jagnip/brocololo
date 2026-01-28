-- Allow recipe ingredients without a selected unit.
ALTER TABLE "recipe_ingredients"
ALTER COLUMN "unit_id" DROP NOT NULL;
