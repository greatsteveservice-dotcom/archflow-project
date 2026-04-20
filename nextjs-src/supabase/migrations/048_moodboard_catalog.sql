-- 048: Catalog items on moodboard canvas
-- Adds 'catalog' item type + link to supply_items

ALTER TABLE moodboard_items DROP CONSTRAINT IF EXISTS moodboard_items_type_check;
ALTER TABLE moodboard_items ADD CONSTRAINT moodboard_items_type_check
  CHECK (type IN ('image','text_note','color_swatch','arrow','catalog'));

ALTER TABLE moodboard_items
  ADD COLUMN IF NOT EXISTS supply_item_id uuid REFERENCES supply_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moodboard_items_supply ON moodboard_items(supply_item_id) WHERE supply_item_id IS NOT NULL;
