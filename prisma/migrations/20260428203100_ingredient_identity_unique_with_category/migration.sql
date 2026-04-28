-- Update ingredient identity uniqueness to include category.
-- Keep expression-based uniqueness (LOWER + COALESCE) so null descriptor/brand
-- values are normalized consistently with existing behavior.

DROP INDEX IF EXISTS "ingredients_identity_unique";

CREATE UNIQUE INDEX "ingredients_identity_unique"
ON "ingredients" (
  LOWER("name"),
  LOWER(COALESCE("descriptor", '')),
  LOWER(COALESCE("brand", '')),
  "category_id"
);
