ALTER TYPE "StoredMealEventType" ADD VALUE 'TRANSFERRED';

ALTER TABLE "stored_meal_events"
  ADD COLUMN "placement_id" TEXT,
  ADD COLUMN "source_lot_id" TEXT,
  ADD COLUMN "destination_plan_id" TEXT,
  ADD COLUMN "destination_date" TIMESTAMP(3),
  ADD COLUMN "destination_meal" "PlannerMealType";

CREATE UNIQUE INDEX "stored_meal_events_placement_id_key"
  ON "stored_meal_events"("placement_id");
