-- Deliberately does not bootstrap any existing account or capture plan snapshots.
ALTER TABLE "rolling_queue_states" ADD COLUMN "lifecycle_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "rolling_meal_entries" DROP CONSTRAINT "rolling_meal_entries_count_check";
ALTER TABLE "rolling_meal_entries" ADD CONSTRAINT "rolling_meal_entries_count_check" CHECK ("count" >= 0);

CREATE TYPE "RollingMealUnitState" AS ENUM ('PENDING', 'COMPLETED', 'CONVERTED', 'DISCARDED');

CREATE TABLE "rolling_meal_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entry_id" TEXT NOT NULL REFERENCES "rolling_meal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "state" "RollingMealUnitState" NOT NULL DEFAULT 'PENDING',
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "current_plan_id" TEXT,
    "placement_id" TEXT,
    "batch_id" TEXT,
    "source_plan_id" TEXT,
    "source_placement_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "rolling_meal_units_assignment_check" CHECK (
        ("current_plan_id" IS NOT NULL AND ("placement_id" IS NOT NULL OR "batch_id" IS NOT NULL)) OR
        ("current_plan_id" IS NULL AND "placement_id" IS NULL AND "batch_id" IS NULL)
    )
);
CREATE UNIQUE INDEX "rolling_meal_units_current_plan_id_placement_id_key" ON "rolling_meal_units"("current_plan_id", "placement_id");
CREATE INDEX "rolling_meal_units_entry_id_state_eligible_idx" ON "rolling_meal_units"("entry_id", "state", "eligible");
CREATE INDEX "rolling_meal_units_current_plan_id_batch_id_idx" ON "rolling_meal_units"("current_plan_id", "batch_id");

CREATE TABLE "rolling_meal_placements" (
    "plan_id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL REFERENCES "rolling_meal_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "batch_id" TEXT,
    PRIMARY KEY ("plan_id", "placement_id")
);
CREATE INDEX "rolling_meal_placements_unit_id_idx" ON "rolling_meal_placements"("unit_id");
