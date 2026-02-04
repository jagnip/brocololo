-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_slots" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "recipe_id" TEXT NOT NULL,

    CONSTRAINT "plan_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_slots_plan_id_idx" ON "plan_slots"("plan_id");

-- CreateIndex
CREATE INDEX "plan_slots_recipe_id_idx" ON "plan_slots"("recipe_id");

-- AddForeignKey
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
