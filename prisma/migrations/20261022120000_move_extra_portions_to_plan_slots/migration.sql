BEGIN;

ALTER TABLE "plan_slots"
ADD COLUMN "extra_portions" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "plan_batches" pb
    WHERE pb."extra_portions" <> 0
      AND NOT EXISTS (
        SELECT 1
        FROM "plan_slots" ps
        WHERE ps."plan_id" = pb."plan_id"
          AND ps."batch_group_id" = pb."id"
          AND ps."recipe_id" = pb."recipe_id"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot migrate extra portions without a matching scheduled slot';
  END IF;
END $$;

WITH matching_slots AS (
  SELECT
    pb."extra_portions",
    ps."id" AS slot_id,
    ROW_NUMBER() OVER (
      PARTITION BY pb."id"
      ORDER BY ps."date", CASE ps."meal_type"
        WHEN 'BREAKFAST' THEN 0
        WHEN 'LUNCH' THEN 1
        WHEN 'DINNER' THEN 2
      END, ps."id"
    ) AS slot_rank
  FROM "plan_batches" pb
  JOIN "plan_slots" ps
    ON ps."plan_id" = pb."plan_id"
   AND ps."batch_group_id" = pb."id"
   AND ps."recipe_id" = pb."recipe_id"
)
UPDATE "plan_slots" ps
SET "extra_portions" = matching_slots."extra_portions"
FROM matching_slots
WHERE matching_slots.slot_rank = 1
  AND ps."id" = matching_slots.slot_id;

ALTER TABLE "plan_slots"
ADD CONSTRAINT "plan_slots_extra_portions_check"
CHECK ("extra_portions" BETWEEN 0 AND 99);

ALTER TABLE "plan_batches"
DROP COLUMN "extra_portions";

COMMIT;
