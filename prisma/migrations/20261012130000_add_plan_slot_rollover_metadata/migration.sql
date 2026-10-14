ALTER TABLE "plan_slots"
ADD COLUMN "is_rolled_over" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "already_cooked" BOOLEAN NOT NULL DEFAULT false;
