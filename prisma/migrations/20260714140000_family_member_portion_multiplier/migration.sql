-- Add household-level portion multiplier on family members.
ALTER TABLE "family_members" ADD COLUMN "portion_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- Migrate recipe-level portion multipliers onto family members (max when duplicated).
UPDATE "family_members" fm
SET "portion_multiplier" = sub.max_multiplier
FROM (
  SELECT "family_member_id", MAX("multiplier") AS max_multiplier
  FROM "recipe_member_portions"
  WHERE "multiplier" <> 1
  GROUP BY "family_member_id"
) sub
WHERE fm.id = sub.family_member_id;

-- Pizza-style 1.5× becomes per-person MODIFY rows (one row per affected ingredient).
INSERT INTO "recipe_ingredient_member_adjustments" (
  "id",
  "recipe_ingredient_id",
  "family_member_id",
  "kind",
  "ingredient_id",
  "amount",
  "unit_id",
  "additional_info"
)
SELECT
  gen_random_uuid()::text,
  ri.id,
  rmp."family_member_id",
  'MODIFY',
  ri."ingredient_id",
  ROUND((ri.amount / NULLIF(r.servings, 0) * rmp.multiplier)::numeric, 6),
  ri."unit_id",
  NULL
FROM "recipe_member_portions" rmp
JOIN "recipes" r ON r.id = rmp."recipe_id"
JOIN "recipe_ingredients" ri ON ri."recipe_id" = r.id
WHERE rmp.multiplier <> 1
  AND ri.amount IS NOT NULL
  AND ri.amount > 0
  AND ri."unit_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "recipe_ingredient_member_adjustments" existing
    WHERE existing."recipe_ingredient_id" = ri.id
      AND existing."family_member_id" = rmp."family_member_id"
  );
