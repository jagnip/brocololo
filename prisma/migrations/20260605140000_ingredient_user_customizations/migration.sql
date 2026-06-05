-- IngredientUserCustomization + scoped slug/identity uniqueness for private ingredients.

CREATE TABLE "ingredient_user_customizations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "supermarket_url" TEXT,
    "additional_info" TEXT,

    CONSTRAINT "ingredient_user_customizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ingredient_user_customizations_user_id_ingredient_id_key"
ON "ingredient_user_customizations"("user_id", "ingredient_id");

CREATE INDEX "ingredient_user_customizations_ingredient_id_idx"
ON "ingredient_user_customizations"("ingredient_id");

ALTER TABLE "ingredient_user_customizations"
ADD CONSTRAINT "ingredient_user_customizations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingredient_user_customizations"
ADD CONSTRAINT "ingredient_user_customizations_ingredient_id_fkey"
FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Slug: global catalog unique; private unique per user.
DROP INDEX IF EXISTS "ingredients_slug_key";

CREATE UNIQUE INDEX "ingredients_slug_global_unique"
ON "ingredients" ("slug")
WHERE "user_id" IS NULL;

CREATE UNIQUE INDEX "ingredients_slug_private_unique"
ON "ingredients" ("user_id", "slug")
WHERE "user_id" IS NOT NULL;

-- Identity: global catalog unique; private unique per user.
DROP INDEX IF EXISTS "ingredients_identity_unique";

CREATE UNIQUE INDEX "ingredients_identity_global_unique"
ON "ingredients" (
  LOWER("name"),
  LOWER(COALESCE("descriptor", '')),
  LOWER(COALESCE("brand", '')),
  "category_id"
)
WHERE "user_id" IS NULL;

CREATE UNIQUE INDEX "ingredients_identity_private_unique"
ON "ingredients" (
  "user_id",
  LOWER("name"),
  LOWER(COALESCE("descriptor", '')),
  LOWER(COALESCE("brand", '')),
  "category_id"
)
WHERE "user_id" IS NOT NULL;
