-- AlterTable
ALTER TABLE "recipes" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "recipes_user_id_archived_at_idx" ON "recipes"("user_id", "archived_at");
