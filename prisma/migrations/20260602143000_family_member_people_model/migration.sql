-- Big-bang migration from role-based people (PRIMARY/SECONDARY) to FamilyMember IDs.
-- Intentional product decisions:
-- - SECONDARY rows with no non-self family member are dropped.
-- - Self recipe portions are implicit multiplier 1 and are not materialized.
-- - "Everyone" ingredient targets are dynamic and represented by applies_to_everyone = true.

-- Recipe member portion weights for non-self family members.
CREATE TABLE "recipe_member_portions" (
    "recipe_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "recipe_member_portions_pkey" PRIMARY KEY ("recipe_id", "family_member_id")
);

-- Ingredient-specific member targets. Empty target rows + applies_to_everyone=false means nobody.
CREATE TABLE "recipe_ingredient_member_targets" (
    "recipe_ingredient_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredient_member_targets_pkey" PRIMARY KEY ("recipe_ingredient_id", "family_member_id")
);

ALTER TABLE "recipe_ingredients"
ADD COLUMN "applies_to_everyone" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "log_entries"
ADD COLUMN "family_member_id" TEXT;

WITH first_non_self AS (
    SELECT DISTINCT ON ("user_id")
        "user_id",
        "id" AS "family_member_id"
    FROM "family_members"
    WHERE "is_self" = false
    ORDER BY "user_id", "sort_order" ASC, "id" ASC
)
INSERT INTO "recipe_member_portions" ("recipe_id", "family_member_id", "multiplier")
SELECT
    r."id",
    first_non_self."family_member_id",
    r."serving_multiplier_for_nelson"
FROM "recipes" r
JOIN first_non_self ON first_non_self."user_id" = r."user_id"
ON CONFLICT DO NOTHING;

-- Migrate ingredient targeting.
UPDATE "recipe_ingredients"
SET "applies_to_everyone" = false
WHERE "nutrition_target" <> 'BOTH'::"NutritionTarget";

INSERT INTO "recipe_ingredient_member_targets" ("recipe_ingredient_id", "family_member_id")
SELECT
    ri."id",
    fm."id"
FROM "recipe_ingredients" ri
JOIN "recipes" r ON r."id" = ri."recipe_id"
JOIN "family_members" fm ON fm."user_id" = r."user_id" AND fm."is_self" = true
WHERE ri."nutrition_target" = 'PRIMARY_ONLY'::"NutritionTarget"
ON CONFLICT DO NOTHING;

WITH first_non_self AS (
    SELECT DISTINCT ON ("user_id")
        "user_id",
        "id" AS "family_member_id"
    FROM "family_members"
    WHERE "is_self" = false
    ORDER BY "user_id", "sort_order" ASC, "id" ASC
)
INSERT INTO "recipe_ingredient_member_targets" ("recipe_ingredient_id", "family_member_id")
SELECT
    ri."id",
    first_non_self."family_member_id"
FROM "recipe_ingredients" ri
JOIN "recipes" r ON r."id" = ri."recipe_id"
JOIN first_non_self ON first_non_self."user_id" = r."user_id"
WHERE ri."nutrition_target" = 'SECONDARY_ONLY'::"NutritionTarget"
ON CONFLICT DO NOTHING;

-- Migrate logs from enum roles to concrete FamilyMember rows.
UPDATE "log_entries" le
SET "family_member_id" = fm."id"
FROM "logs" l
JOIN "plans" p ON p."id" = l."plan_id"
JOIN "family_members" fm ON fm."user_id" = p."user_id" AND fm."is_self" = true
WHERE le."log_id" = l."id"
  AND le."person" = 'PRIMARY'::"LogPerson";

WITH first_non_self AS (
    SELECT DISTINCT ON ("user_id")
        "user_id",
        "id" AS "family_member_id"
    FROM "family_members"
    WHERE "is_self" = false
    ORDER BY "user_id", "sort_order" ASC, "id" ASC
)
UPDATE "log_entries" le
SET "family_member_id" = first_non_self."family_member_id"
FROM "logs" l
JOIN "plans" p ON p."id" = l."plan_id"
JOIN first_non_self ON first_non_self."user_id" = p."user_id"
WHERE le."log_id" = l."id"
  AND le."person" = 'SECONDARY'::"LogPerson";

-- Drops legacy SECONDARY rows when there is no non-self member to own them.
-- Child log_entry_recipes/log_ingredients are removed by existing ON DELETE CASCADE FKs.
DELETE FROM "log_entries"
WHERE "family_member_id" IS NULL;

DROP INDEX "log_entries_log_id_date_meal_type_person_key";

ALTER TABLE "log_entries"
ALTER COLUMN "family_member_id" SET NOT NULL;

CREATE UNIQUE INDEX "log_entries_log_id_date_meal_type_family_member_id_key"
ON "log_entries"("log_id", "date", "meal_type", "family_member_id");

CREATE INDEX "log_entries_family_member_id_idx"
ON "log_entries"("family_member_id");

CREATE INDEX "recipe_member_portions_family_member_id_idx"
ON "recipe_member_portions"("family_member_id");

CREATE INDEX "recipe_ingredient_member_targets_family_member_id_idx"
ON "recipe_ingredient_member_targets"("family_member_id");

ALTER TABLE "recipe_member_portions"
ADD CONSTRAINT "recipe_member_portions_recipe_id_fkey"
FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_member_portions"
ADD CONSTRAINT "recipe_member_portions_family_member_id_fkey"
FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredient_member_targets"
ADD CONSTRAINT "recipe_ingredient_member_targets_recipe_ingredient_id_fkey"
FOREIGN KEY ("recipe_ingredient_id") REFERENCES "recipe_ingredients"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredient_member_targets"
ADD CONSTRAINT "recipe_ingredient_member_targets_family_member_id_fkey"
FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "log_entries"
ADD CONSTRAINT "log_entries_family_member_id_fkey"
FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredients"
DROP COLUMN "nutrition_target";

ALTER TABLE "recipes"
DROP COLUMN "serving_multiplier_for_nelson";

ALTER TABLE "log_entries"
DROP COLUMN "person";

DROP TYPE "NutritionTarget";
DROP TYPE "LogPerson";
