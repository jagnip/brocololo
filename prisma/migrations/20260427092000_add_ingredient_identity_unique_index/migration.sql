CREATE UNIQUE INDEX "ingredients_identity_unique"
ON "ingredients" (
  LOWER("name"),
  LOWER(COALESCE("descriptor", '')),
  LOWER(COALESCE("brand", ''))
);
