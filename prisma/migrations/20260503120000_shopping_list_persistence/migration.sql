-- CreateTable
CREATE TABLE "grocery_ingredients" (
    "id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "additional_info" TEXT,
    "substitutions_allowed" BOOLEAN NOT NULL DEFAULT false,
    "substitution_note" TEXT,

    CONSTRAINT "grocery_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_layout_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shopping_layout_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_layout_preset_categories" (
    "id" TEXT NOT NULL,
    "preset_id" TEXT NOT NULL,
    "ingredient_category_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "shopping_layout_preset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "active_layout_preset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" TEXT NOT NULL,
    "shopping_list_id" TEXT NOT NULL,
    "grocery_ingredient_id" TEXT,
    "ingredient_category_id" TEXT NOT NULL,
    "display_label" TEXT NOT NULL,
    "unit_id" TEXT,
    "amount" DOUBLE PRECISION,
    "additional_info" TEXT,
    "substitutions_allowed" BOOLEAN NOT NULL DEFAULT false,
    "substitution_note" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "recipe_attribution" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grocery_ingredients_ingredient_id_key" ON "grocery_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_layout_preset_categories_preset_id_ingredient_category_id_key" ON "shopping_layout_preset_categories"("preset_id", "ingredient_category_id");

-- CreateIndex
CREATE INDEX "shopping_layout_preset_categories_preset_id_position_idx" ON "shopping_layout_preset_categories"("preset_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_lists_plan_id_key" ON "shopping_lists"("plan_id");

-- CreateIndex
CREATE INDEX "shopping_list_items_shopping_list_id_ingredient_category_id_position_idx" ON "shopping_list_items"("shopping_list_id", "ingredient_category_id", "position");

-- AddForeignKey
ALTER TABLE "grocery_ingredients" ADD CONSTRAINT "grocery_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_layout_preset_categories" ADD CONSTRAINT "shopping_layout_preset_categories_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "shopping_layout_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_layout_preset_categories" ADD CONSTRAINT "shopping_layout_preset_categories_ingredient_category_id_fkey" FOREIGN KEY ("ingredient_category_id") REFERENCES "ingredient_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_active_layout_preset_id_fkey" FOREIGN KEY ("active_layout_preset_id") REFERENCES "shopping_layout_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_grocery_ingredient_id_fkey" FOREIGN KEY ("grocery_ingredient_id") REFERENCES "grocery_ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_ingredient_category_id_fkey" FOREIGN KEY ("ingredient_category_id") REFERENCES "ingredient_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
