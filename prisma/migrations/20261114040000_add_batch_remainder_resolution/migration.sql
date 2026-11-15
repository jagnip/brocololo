CREATE TABLE "plan_batch_remainder_resolutions" (
    "plan_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    CONSTRAINT "plan_batch_remainder_resolutions_pkey" PRIMARY KEY ("plan_id", "batch_id"),
    CONSTRAINT "plan_batch_remainder_resolutions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "plan_batch_remainder_resolutions" ("plan_id", "batch_id")
SELECT DISTINCT "source_plan_id", "source_plan_batch_id"
FROM "stored_meal_lots"
WHERE "source_plan_id" IS NOT NULL AND "source_plan_batch_id" IS NOT NULL
ON CONFLICT DO NOTHING;
