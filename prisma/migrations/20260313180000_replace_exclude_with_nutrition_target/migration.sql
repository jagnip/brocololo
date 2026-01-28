-- Replace legacy exclude flag with explicit nutrition target roles.
CREATE TYPE "NutritionTarget" AS ENUM ('BOTH', 'PRIMARY_ONLY', 'SECONDARY_ONLY');

ALTER TABLE "recipe_ingredients"
ADD COLUMN "nutrition_target" "NutritionTarget" NOT NULL DEFAULT 'BOTH';

-- Preserve old behavior: excluded rows were counted only for secondary.
UPDATE "recipe_ingredients"
SET "nutrition_target" = 'SECONDARY_ONLY'::"NutritionTarget"
WHERE COALESCE("exclude_from_nutrition", false) = true;

ALTER TABLE "recipe_ingredients"
DROP COLUMN "exclude_from_nutrition";
