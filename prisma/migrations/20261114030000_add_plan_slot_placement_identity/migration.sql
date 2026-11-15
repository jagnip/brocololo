ALTER TABLE "plan_slots" ADD COLUMN "placement_id" TEXT;

UPDATE "plan_slots"
SET "placement_id" = "id"
WHERE "recipe_id" IS NOT NULL OR "custom_name" IS NOT NULL;

CREATE UNIQUE INDEX "plan_slots_plan_id_placement_id_key" ON "plan_slots"("plan_id", "placement_id");
