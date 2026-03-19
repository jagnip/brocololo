-- Rename planner enum for clearer domain boundaries.
ALTER TYPE "MealType" RENAME TO "PlannerMealType";

-- CreateEnum
CREATE TYPE "LogMealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER');

-- CreateEnum
CREATE TYPE "LogPerson" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "log_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "LogMealType" NOT NULL,
    "person" "LogPerson" NOT NULL,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entry_recipes" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "source_recipe_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "log_entry_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_ingredients" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "entry_recipe_id" TEXT,
    "ingredient_id" TEXT,
    "amount" DOUBLE PRECISION,
    "unit_id" TEXT,

    CONSTRAINT "log_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logs_plan_id_key" ON "logs"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "log_entries_log_id_date_meal_type_person_key"
ON "log_entries"("log_id", "date", "meal_type", "person");

-- CreateIndex
CREATE INDEX "log_entries_log_id_idx" ON "log_entries"("log_id");

-- CreateIndex
CREATE INDEX "log_entry_recipes_entry_id_idx" ON "log_entry_recipes"("entry_id");

-- CreateIndex
CREATE INDEX "log_entry_recipes_source_recipe_id_idx" ON "log_entry_recipes"("source_recipe_id");

-- CreateIndex
CREATE INDEX "log_ingredients_entry_id_idx" ON "log_ingredients"("entry_id");

-- CreateIndex
CREATE INDEX "log_ingredients_entry_recipe_id_idx" ON "log_ingredients"("entry_recipe_id");

-- CreateIndex
CREATE INDEX "log_ingredients_ingredient_id_idx" ON "log_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX "log_ingredients_unit_id_idx" ON "log_ingredients"("unit_id");

-- AddForeignKey
ALTER TABLE "logs"
ADD CONSTRAINT "logs_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries"
ADD CONSTRAINT "log_entries_log_id_fkey"
FOREIGN KEY ("log_id") REFERENCES "logs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entry_recipes"
ADD CONSTRAINT "log_entry_recipes_entry_id_fkey"
FOREIGN KEY ("entry_id") REFERENCES "log_entries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entry_recipes"
ADD CONSTRAINT "log_entry_recipes_source_recipe_id_fkey"
FOREIGN KEY ("source_recipe_id") REFERENCES "recipes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_ingredients"
ADD CONSTRAINT "log_ingredients_entry_id_fkey"
FOREIGN KEY ("entry_id") REFERENCES "log_entries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_ingredients"
ADD CONSTRAINT "log_ingredients_entry_recipe_id_fkey"
FOREIGN KEY ("entry_recipe_id") REFERENCES "log_entry_recipes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_ingredients"
ADD CONSTRAINT "log_ingredients_ingredient_id_fkey"
FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_ingredients"
ADD CONSTRAINT "log_ingredients_unit_id_fkey"
FOREIGN KEY ("unit_id") REFERENCES "units"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
