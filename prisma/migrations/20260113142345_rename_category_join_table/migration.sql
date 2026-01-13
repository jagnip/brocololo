/*
  Warnings:

  - You are about to drop the `_CategoryToRecipe` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToRecipe" DROP CONSTRAINT "_CategoryToRecipe_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToRecipe" DROP CONSTRAINT "_CategoryToRecipe_B_fkey";

-- DropTable
DROP TABLE "_CategoryToRecipe";

-- CreateTable
CREATE TABLE "_category_recipes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_category_recipes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_category_recipes_B_index" ON "_category_recipes"("B");

-- AddForeignKey
ALTER TABLE "_category_recipes" ADD CONSTRAINT "_category_recipes_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_category_recipes" ADD CONSTRAINT "_category_recipes_B_fkey" FOREIGN KEY ("B") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
