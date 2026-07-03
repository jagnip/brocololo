-- Reset plan_slots.used when the flag was set by old Track-tab logging (global consume).
-- Manage-tab skips stay used=true because they have no log_entry_recipes links.
UPDATE plan_slots
SET used = false
WHERE used = true
  AND id IN (
    SELECT DISTINCT plan_slot_id
    FROM log_entry_recipes
    WHERE plan_slot_id IS NOT NULL
  );
