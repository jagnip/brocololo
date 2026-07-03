-- Provision missing SNACK rows so Track snack slots have backing log_entries.
INSERT INTO "log_entries" ("id", "log_id", "date", "meal_type", "family_member_id")
SELECT
  'backfill_snack_' || md5(le."log_id" || le."date"::text || le."family_member_id"),
  le."log_id",
  le."date",
  'SNACK'::"LogMealType",
  le."family_member_id"
FROM (
  SELECT DISTINCT "log_id", "date", "family_member_id"
  FROM "log_entries"
) le
WHERE NOT EXISTS (
  SELECT 1
  FROM "log_entries" existing
  WHERE existing."log_id" = le."log_id"
    AND existing."date" = le."date"
    AND existing."family_member_id" = le."family_member_id"
    AND existing."meal_type" = 'SNACK'
);
