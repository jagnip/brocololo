-- AlterTable
ALTER TABLE "plan_slots" ADD COLUMN "custom_name" TEXT;

-- CreateTable
CREATE TABLE "plan_slot_custom_ingredients" (
    "id" TEXT NOT NULL,
    "plan_slot_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "amount" DOUBLE PRECISION,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plan_slot_custom_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_slot_custom_ingredients_plan_slot_id_position_idx" ON "plan_slot_custom_ingredients"("plan_slot_id", "position");

-- CreateIndex
CREATE INDEX "plan_slot_custom_ingredients_ingredient_id_idx" ON "plan_slot_custom_ingredients"("ingredient_id");

-- AddForeignKey
ALTER TABLE "plan_slot_custom_ingredients" ADD CONSTRAINT "plan_slot_custom_ingredients_plan_slot_id_fkey" FOREIGN KEY ("plan_slot_id") REFERENCES "plan_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_slot_custom_ingredients" ADD CONSTRAINT "plan_slot_custom_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_slot_custom_ingredients" ADD CONSTRAINT "plan_slot_custom_ingredients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
