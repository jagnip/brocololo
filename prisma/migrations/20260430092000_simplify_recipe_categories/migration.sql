-- Remove category hierarchy first (self-FK and parent pointer).
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_fkey";
DROP INDEX IF EXISTS "categories_parent_id_idx";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "parent_id";

-- Replace enum values: FLAVOUR -> MEAL_OCCASION.
ALTER TYPE "CategoryType" RENAME TO "CategoryType_old";
CREATE TYPE "CategoryType" AS ENUM ('MEAL_OCCASION', 'RECIPE_TYPE', 'PROTEIN');

ALTER TABLE "categories"
ALTER COLUMN "type" TYPE "CategoryType"
USING (
  CASE
    WHEN "type"::text = 'FLAVOUR' THEN 'MEAL_OCCASION'
    ELSE "type"::text
  END
)::"CategoryType";

DROP TYPE "CategoryType_old";

-- Convert old flavour rows into first-class meal occasions.
UPDATE "categories"
SET "name" = 'Breakfast',
    "slug" = 'breakfast'
WHERE "type" = 'MEAL_OCCASION' AND "slug" = 'sweet';

UPDATE "categories"
SET "name" = 'Lunch',
    "slug" = 'lunch'
WHERE "type" = 'MEAL_OCCASION' AND "slug" = 'savoury';

-- Ensure all fixed occasions exist.
INSERT INTO "categories" ("id", "name", "slug", "type")
SELECT 'meal-occasion-dinner', 'Dinner', 'dinner', 'MEAL_OCCASION'
WHERE NOT EXISTS (
  SELECT 1 FROM "categories" WHERE "slug" = 'dinner'
);

INSERT INTO "categories" ("id", "name", "slug", "type")
SELECT 'meal-occasion-snack', 'Snack', 'snack', 'MEAL_OCCASION'
WHERE NOT EXISTS (
  SELECT 1 FROM "categories" WHERE "slug" = 'snack'
);

-- Preserve previous planner semantics:
-- recipes that were savoury (now lunch) should also qualify for dinner.
WITH lunch_category AS (
  SELECT "id" FROM "categories" WHERE "type" = 'MEAL_OCCASION' AND "slug" = 'lunch' LIMIT 1
),
dinner_category AS (
  SELECT "id" FROM "categories" WHERE "type" = 'MEAL_OCCASION' AND "slug" = 'dinner' LIMIT 1
)
INSERT INTO "_category_recipes" ("A", "B")
SELECT dinner_category."id", recipe_links."B"
FROM "_category_recipes" recipe_links
CROSS JOIN lunch_category
CROSS JOIN dinner_category
WHERE recipe_links."A" = lunch_category."id"
ON CONFLICT ("A", "B") DO NOTHING;
