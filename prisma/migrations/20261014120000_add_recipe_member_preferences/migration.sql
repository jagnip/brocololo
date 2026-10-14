CREATE TYPE "RecipePreference" AS ENUM ('LIKE', 'LOVE', 'AVOID');

CREATE TABLE "recipe_member_preferences" (
    "recipe_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    "preference" "RecipePreference" NOT NULL,

    CONSTRAINT "recipe_member_preferences_pkey" PRIMARY KEY ("recipe_id", "family_member_id")
);

CREATE INDEX "recipe_member_preferences_family_member_id_idx" ON "recipe_member_preferences"("family_member_id");

ALTER TABLE "recipe_member_preferences" ADD CONSTRAINT "recipe_member_preferences_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_member_preferences" ADD CONSTRAINT "recipe_member_preferences_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
