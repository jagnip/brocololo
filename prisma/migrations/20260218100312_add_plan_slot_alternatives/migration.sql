-- CreateTable
CREATE TABLE "plan_slot_alternatives" (
    "id" TEXT NOT NULL,
    "plan_slot_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "plan_slot_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_slot_alternatives_plan_slot_id_idx" ON "plan_slot_alternatives"("plan_slot_id");

-- CreateIndex
CREATE INDEX "plan_slot_alternatives_recipe_id_idx" ON "plan_slot_alternatives"("recipe_id");

-- AddForeignKey
ALTER TABLE "plan_slot_alternatives" ADD CONSTRAINT "plan_slot_alternatives_plan_slot_id_fkey" FOREIGN KEY ("plan_slot_id") REFERENCES "plan_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_slot_alternatives" ADD CONSTRAINT "plan_slot_alternatives_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
