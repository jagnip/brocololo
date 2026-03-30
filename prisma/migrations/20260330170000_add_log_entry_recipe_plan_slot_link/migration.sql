-- Link each log entry recipe to the consumed planner slot (optional).
ALTER TABLE "log_entry_recipes"
ADD COLUMN "plan_slot_id" TEXT;

CREATE INDEX "log_entry_recipes_plan_slot_id_idx"
ON "log_entry_recipes"("plan_slot_id");

ALTER TABLE "log_entry_recipes"
ADD CONSTRAINT "log_entry_recipes_plan_slot_id_fkey"
FOREIGN KEY ("plan_slot_id") REFERENCES "plan_slots"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

