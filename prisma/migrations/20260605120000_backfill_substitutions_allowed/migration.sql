-- Align persisted flags with note-only semantics after removing the UI toggle.
UPDATE grocery_ingredients
SET substitutions_allowed = true
WHERE substitution_note IS NOT NULL
  AND substitution_note <> '';

UPDATE shopping_list_items
SET substitutions_allowed = true
WHERE substitution_note IS NOT NULL
  AND substitution_note <> '';
