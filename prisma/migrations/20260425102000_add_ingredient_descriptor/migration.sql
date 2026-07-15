ALTER TABLE "ingredients" ADD COLUMN "descriptor" TEXT;

-- Identity uniqueness indexes (added next migration) include brand; column was missing from history.
ALTER TABLE "ingredients" ADD COLUMN "brand" TEXT;

UPDATE "ingredients"
SET
  "descriptor" = NULLIF(btrim(substring("name" from '\(([^()]*)\)\s*$')), ''),
  "name" = btrim(regexp_replace("name", '\s*\([^()]*\)\s*$', ''))
WHERE "name" ~ '\([^()]*\)\s*$'
  AND NULLIF(btrim(substring("name" from '\(([^()]*)\)\s*$')), '') IS NOT NULL;
