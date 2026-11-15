CREATE TABLE "rolling_queue_states" (
    "user_id" TEXT NOT NULL PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "rolling_captured_plans" (
    "plan_id" TEXT NOT NULL PRIMARY KEY REFERENCES "plans"("id") ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "rolling_captured_plans_user_id_idx" ON "rolling_captured_plans"("user_id");

CREATE TABLE "rolling_meal_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "identity" TEXT NOT NULL,
    "recipe_id" TEXT REFERENCES "recipes"("id") ON DELETE CASCADE,
    "meal_type" "PlannerMealType",
    "custom_meal" JSONB,
    "count" INTEGER NOT NULL CHECK ("count" > 0),
    "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
    CONSTRAINT "rolling_meal_entries_identity_check" CHECK (
      ("recipe_id" IS NOT NULL AND "meal_type" IS NULL AND "custom_meal" IS NULL) OR
      ("recipe_id" IS NULL AND "meal_type" IS NOT NULL AND "custom_meal" IS NOT NULL)
    )
);
CREATE UNIQUE INDEX "rolling_meal_entries_user_id_identity_key" ON "rolling_meal_entries"("user_id", "identity");
CREATE INDEX "rolling_meal_entries_recipe_id_idx" ON "rolling_meal_entries"("recipe_id");
