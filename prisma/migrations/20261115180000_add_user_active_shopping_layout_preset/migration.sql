ALTER TABLE "users"
ADD COLUMN "active_shopping_layout_preset_id" TEXT;

ALTER TABLE "users"
ADD CONSTRAINT "users_active_shopping_layout_preset_id_fkey"
FOREIGN KEY ("active_shopping_layout_preset_id")
REFERENCES "shopping_layout_presets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
