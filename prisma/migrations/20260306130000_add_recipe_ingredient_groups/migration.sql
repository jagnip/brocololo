-- Add explicit ingredient groups per recipe.
CREATE TABLE "recipe_ingredient_groups" (
  "id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "recipe_ingredient_groups_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "recipe_ingredient_groups"
ADD CONSTRAINT "recipe_ingredient_groups_recipe_id_fkey"
FOREIGN KEY ("recipe_id")
REFERENCES "recipes"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "recipe_ingredient_groups_recipe_id_idx"
ON "recipe_ingredient_groups"("recipe_id");

CREATE UNIQUE INDEX "recipe_ingredient_groups_recipe_id_position_key"
ON "recipe_ingredient_groups"("recipe_id", "position");

-- Add grouping and ordering columns to recipe ingredients.
ALTER TABLE "recipe_ingredients"
ADD COLUMN "group_id" TEXT,
ADD COLUMN "position" INTEGER;

ALTER TABLE "recipe_ingredients"
ADD CONSTRAINT "recipe_ingredients_group_id_fkey"
FOREIGN KEY ("group_id")
REFERENCES "recipe_ingredient_groups"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Keep this index in the migration that introduces group_id.
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_id_group_id_idx"
ON "recipe_ingredients"("recipe_id", "group_id");

-- Backfill existing recipes to use 0-based ordering per recipe.
WITH ranked_ingredients AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "recipe_id"
      ORDER BY "id"
    ) - 1 AS "position"
  FROM "recipe_ingredients"
)
UPDATE "recipe_ingredients" AS ri
SET "position" = ranked_ingredients."position"
FROM ranked_ingredients
WHERE ri."id" = ranked_ingredients."id";

-- Make ordering mandatory after backfill.
ALTER TABLE "recipe_ingredients"
ALTER COLUMN "position" SET NOT NULL;

-- Grouped ingredients must have unique positions inside each group.
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_group_id_position_key"
ON "recipe_ingredients"("recipe_id", "group_id", "position")
WHERE "group_id" IS NOT NULL;

-- Ungrouped ingredients also need unique positions within a recipe.
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_position_ungrouped_key"
ON "recipe_ingredients"("recipe_id", "position")
WHERE "group_id" IS NULL;
