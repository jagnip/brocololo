-- CreateTable
CREATE TABLE "recipe_audience_members" (
    "recipe_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,

    CONSTRAINT "recipe_audience_members_pkey" PRIMARY KEY ("recipe_id","family_member_id")
);

-- CreateTable
CREATE TABLE "plan_audience_members" (
    "plan_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,

    CONSTRAINT "plan_audience_members_pkey" PRIMARY KEY ("plan_id","family_member_id")
);

-- Backfill existing recipes as suitable for the whole current household.
INSERT INTO "recipe_audience_members" ("recipe_id", "family_member_id")
SELECT r."id", fm."id"
FROM "recipes" r
JOIN "family_members" fm ON fm."user_id" = r."user_id"
ON CONFLICT DO NOTHING;

-- Backfill existing plans as cooking for the whole current household.
INSERT INTO "plan_audience_members" ("plan_id", "family_member_id")
SELECT p."id", fm."id"
FROM "plans" p
JOIN "family_members" fm ON fm."user_id" = p."user_id"
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "recipe_audience_members_family_member_id_idx" ON "recipe_audience_members"("family_member_id");

-- CreateIndex
CREATE INDEX "plan_audience_members_family_member_id_idx" ON "plan_audience_members"("family_member_id");

-- AddForeignKey
ALTER TABLE "recipe_audience_members" ADD CONSTRAINT "recipe_audience_members_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_audience_members" ADD CONSTRAINT "recipe_audience_members_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_audience_members" ADD CONSTRAINT "plan_audience_members_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_audience_members" ADD CONSTRAINT "plan_audience_members_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
