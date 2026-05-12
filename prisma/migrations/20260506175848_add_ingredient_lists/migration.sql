-- CreateTable
CREATE TABLE "ingredient_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_list_items" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingredient_list_items_list_id_position_idx" ON "ingredient_list_items"("list_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_list_items_list_id_ingredient_id_key" ON "ingredient_list_items"("list_id", "ingredient_id");

-- AddForeignKey
ALTER TABLE "ingredient_list_items" ADD CONSTRAINT "ingredient_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "ingredient_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_list_items" ADD CONSTRAINT "ingredient_list_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
