-- Add per-ingredient default unit so recipe forms can preselect the most useful unit.
ALTER TABLE "ingredients"
ADD COLUMN "default_unit_id" TEXT;

-- Backfill using deterministic fallback:
-- 1) prefer "g" when configured for the ingredient
-- 2) otherwise pick the first conversion by unit name, then unit id
UPDATE "ingredients" AS i
SET "default_unit_id" = picks."unit_id"
FROM (
  SELECT
    iu."ingredient_id",
    COALESCE(
      MAX(CASE WHEN u."name" = 'g' THEN iu."unit_id" END),
      (ARRAY_AGG(iu."unit_id" ORDER BY u."name" ASC, iu."unit_id" ASC))[1]
    ) AS "unit_id"
  FROM "ingredient_units" AS iu
  INNER JOIN "units" AS u ON u."id" = iu."unit_id"
  GROUP BY iu."ingredient_id"
) AS picks
WHERE i."id" = picks."ingredient_id";

CREATE INDEX "ingredients_default_unit_id_idx"
ON "ingredients"("default_unit_id");

ALTER TABLE "ingredients"
ADD CONSTRAINT "ingredients_default_unit_id_fkey"
FOREIGN KEY ("default_unit_id") REFERENCES "units"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
