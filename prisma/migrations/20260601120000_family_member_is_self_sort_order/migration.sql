-- Phase 1: many family members per user; isSelf marks the account holder ("Me").
-- Phase 2 will wire logs/planner to familyMemberId instead of LogPerson.

-- Add new columns (nullable during backfill).
ALTER TABLE "family_members" ADD COLUMN "is_self" BOOLEAN;
ALTER TABLE "family_members" ADD COLUMN "sort_order" INTEGER;

-- Backfill from legacy position slots.
UPDATE "family_members" SET "is_self" = true, "sort_order" = 0 WHERE "position" = 0;
UPDATE "family_members" SET "is_self" = false, "sort_order" = 1 WHERE "position" = 1;

-- Any unexpected rows: treat lowest position as self.
UPDATE "family_members"
SET "is_self" = false, "sort_order" = COALESCE("position", 0)
WHERE "is_self" IS NULL;

-- Drop legacy two-slot constraint and column.
DROP INDEX IF EXISTS "family_members_user_id_position_key";
ALTER TABLE "family_members" DROP COLUMN "position";

-- Enforce NOT NULL on new columns.
ALTER TABLE "family_members" ALTER COLUMN "is_self" SET NOT NULL;
ALTER TABLE "family_members" ALTER COLUMN "is_self" SET DEFAULT false;
ALTER TABLE "family_members" ALTER COLUMN "sort_order" SET NOT NULL;

CREATE INDEX "family_members_user_id_sort_order_idx" ON "family_members"("user_id", "sort_order");
