-- AlterTable
ALTER TABLE "recipes" ADD COLUMN "planned_meal_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "recipes" ADD COLUMN "is_batch_recipe" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "plan_slots" ADD COLUMN "batch_group_id" TEXT;

-- CreateIndex
CREATE INDEX "plan_slots_batch_group_id_idx" ON "plan_slots"("batch_group_id");
