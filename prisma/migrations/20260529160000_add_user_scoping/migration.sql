-- User scoping: each Clerk account owns its recipes, plans, and ingredient lists.
-- Family members are display names for log/planner (not separate logins).
--
-- Upgrading a database that already has rows:
--   1. This migration adds nullable user_id columns.
--   2. Run: MIGRATION_OWNER_CLERK_ID=<clerk_id> npx tsx prisma/backfill-user-data.ts
--   3. Re-run the NOT NULL section below if you applied an earlier draft without it,
--      or use `prisma db push` after backfill on dev only.
--
-- If this database was already updated via `db push`, mark as applied without re-running:
--   npx prisma migrate resolve --applied 20260529160000_add_user_scoping

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_user_id_position_key" ON "family_members"("user_id", "position");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add ownership columns (nullable until backfill)
ALTER TABLE "plans" ADD COLUMN "user_id" TEXT;
ALTER TABLE "recipes" ADD COLUMN "user_id" TEXT;
ALTER TABLE "ingredient_lists" ADD COLUMN "user_id" TEXT;
ALTER TABLE "ingredients" ADD COLUMN "user_id" TEXT;

-- DropIndex: recipe name/slug are unique per user, not globally
DROP INDEX "recipes_name_key";
DROP INDEX "recipes_slug_key";

-- CreateIndex
CREATE INDEX "plans_user_id_idx" ON "plans"("user_id");
CREATE INDEX "recipes_user_id_idx" ON "recipes"("user_id");
CREATE INDEX "recipes_slug_idx" ON "recipes"("slug");
CREATE INDEX "ingredient_lists_user_id_idx" ON "ingredient_lists"("user_id");
CREATE INDEX "ingredients_user_id_idx" ON "ingredients"("user_id");

-- AddForeignKey (nullable user_id on ingredients allows shared seed catalog)
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredient_lists" ADD CONSTRAINT "ingredient_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Require user_id on owned tables (fails if any row still has NULL — run backfill first)
ALTER TABLE "plans" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "ingredient_lists" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex: per-user recipe uniqueness
CREATE UNIQUE INDEX "recipes_user_id_slug_key" ON "recipes"("user_id", "slug");
CREATE UNIQUE INDEX "recipes_user_id_name_key" ON "recipes"("user_id", "name");
