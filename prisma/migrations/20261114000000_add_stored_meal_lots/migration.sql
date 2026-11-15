CREATE TYPE "StoredMealEventType" AS ENUM ('CREATED', 'ADJUSTED', 'USED', 'DISCARDED');

CREATE TABLE "stored_meal_lots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "source_plan_id" TEXT,
    "source_plan_batch_id" TEXT,
    "count" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cooked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stored_meal_lots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stored_meal_lots_count_positive" CHECK ("count" > 0)
);

CREATE TABLE "stored_meal_lot_audience_members" (
    "lot_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,

    CONSTRAINT "stored_meal_lot_audience_members_pkey" PRIMARY KEY ("lot_id", "family_member_id")
);

CREATE TABLE "stored_meal_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lot_id" TEXT,
    "recipe_id" TEXT NOT NULL,
    "recipe_name" TEXT NOT NULL,
    "type" "StoredMealEventType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previous_count" INTEGER,
    "next_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_meal_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stored_meal_events_quantity_positive" CHECK ("quantity" > 0)
);

CREATE INDEX "stored_meal_lots_user_id_cooked_at_idx" ON "stored_meal_lots"("user_id", "cooked_at");
CREATE INDEX "stored_meal_lots_user_id_recipe_id_idx" ON "stored_meal_lots"("user_id", "recipe_id");
CREATE INDEX "stored_meal_lots_source_plan_id_idx" ON "stored_meal_lots"("source_plan_id");
CREATE INDEX "stored_meal_lot_audience_members_family_member_id_idx" ON "stored_meal_lot_audience_members"("family_member_id");
CREATE INDEX "stored_meal_events_user_id_created_at_idx" ON "stored_meal_events"("user_id", "created_at");
CREATE INDEX "stored_meal_events_lot_id_idx" ON "stored_meal_events"("lot_id");

ALTER TABLE "stored_meal_lots"
  ADD CONSTRAINT "stored_meal_lots_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stored_meal_lots"
  ADD CONSTRAINT "stored_meal_lots_recipe_id_fkey"
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stored_meal_lots"
  ADD CONSTRAINT "stored_meal_lots_source_plan_id_fkey"
  FOREIGN KEY ("source_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stored_meal_lot_audience_members"
  ADD CONSTRAINT "stored_meal_lot_audience_members_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "stored_meal_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stored_meal_lot_audience_members"
  ADD CONSTRAINT "stored_meal_lot_audience_members_family_member_id_fkey"
  FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stored_meal_events"
  ADD CONSTRAINT "stored_meal_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stored_meal_events"
  ADD CONSTRAINT "stored_meal_events_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "stored_meal_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stored_meal_events"
  ADD CONSTRAINT "stored_meal_events_recipe_id_fkey"
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
