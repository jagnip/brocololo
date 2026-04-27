ALTER TABLE "ingredients" ADD COLUMN "descriptor" TEXT;

UPDATE "ingredients"
SET
  "descriptor" = NULLIF(btrim(substring("name" from '\(([^()]*)\)\s*$')), ''),
  "name" = btrim(regexp_replace("name", '\s*\([^()]*\)\s*$', ''))
WHERE "name" ~ '\([^()]*\)\s*$'
  AND NULLIF(btrim(substring("name" from '\(([^()]*)\)\s*$')), '') IS NOT NULL;
