-- CreateIndex guarded for clean shadow DB replay.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'recipe_ingredients'
      AND column_name = 'group_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_id_group_id_idx"
    ON "recipe_ingredients"("recipe_id", "group_id");
  END IF;
END $$;
