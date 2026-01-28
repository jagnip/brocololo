-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "instructions";

-- CreateTable
CREATE TABLE "recipe_instructions" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "recipe_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_instruction_ingredients" (
    "instruction_id" TEXT NOT NULL,
    "recipe_ingredient_id" TEXT NOT NULL,

    CONSTRAINT "recipe_instruction_ingredients_pkey" PRIMARY KEY ("instruction_id","recipe_ingredient_id")
);

-- CreateIndex
CREATE INDEX "recipe_instructions_recipe_id_idx" ON "recipe_instructions"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_instructions_recipe_id_position_key" ON "recipe_instructions"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "recipe_instruction_ingredients_recipe_ingredient_id_idx" ON "recipe_instruction_ingredients"("recipe_ingredient_id");

-- AddForeignKey
ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_instruction_ingredients" ADD CONSTRAINT "recipe_instruction_ingredients_instruction_id_fkey" FOREIGN KEY ("instruction_id") REFERENCES "recipe_instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_instruction_ingredients" ADD CONSTRAINT "recipe_instruction_ingredients_recipe_ingredient_id_fkey" FOREIGN KEY ("recipe_ingredient_id") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
