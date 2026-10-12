CREATE TABLE "plan_batches" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "extra_portions" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "plan_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_batch_storage_rows" (
    "id" TEXT NOT NULL,
    "plan_batch_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "plan_batch_storage_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_batch_storage_row_audience_members" (
    "storage_row_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,
    CONSTRAINT "plan_batch_storage_row_audience_members_pkey" PRIMARY KEY ("storage_row_id", "family_member_id")
);

CREATE INDEX "plan_batches_plan_id_idx" ON "plan_batches"("plan_id");
CREATE INDEX "plan_batches_recipe_id_idx" ON "plan_batches"("recipe_id");
CREATE INDEX "plan_batch_storage_rows_plan_batch_id_position_idx" ON "plan_batch_storage_rows"("plan_batch_id", "position");
CREATE INDEX "plan_batch_storage_row_audience_members_family_member_id_idx" ON "plan_batch_storage_row_audience_members"("family_member_id");

ALTER TABLE "plan_batches" ADD CONSTRAINT "plan_batches_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_batches" ADD CONSTRAINT "plan_batches_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_batch_storage_rows" ADD CONSTRAINT "plan_batch_storage_rows_plan_batch_id_fkey" FOREIGN KEY ("plan_batch_id") REFERENCES "plan_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_batch_storage_row_audience_members" ADD CONSTRAINT "plan_batch_storage_row_audience_members_storage_row_id_fkey" FOREIGN KEY ("storage_row_id") REFERENCES "plan_batch_storage_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_batch_storage_row_audience_members" ADD CONSTRAINT "plan_batch_storage_row_audience_members_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
