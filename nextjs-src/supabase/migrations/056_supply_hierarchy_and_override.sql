-- 056_supply_hierarchy_and_override.sql
-- Add hierarchy fields (group_name, subcategory) and manual override for order deadline
-- to match the spec spreadsheets used by designers (Этап → Помещение → Группа → Подгруппа → Наименование)

ALTER TABLE supply_items
  ADD COLUMN IF NOT EXISTS group_name TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS order_deadline_override DATE;

CREATE INDEX IF NOT EXISTS idx_supply_items_group_name ON supply_items(group_name);
CREATE INDEX IF NOT EXISTS idx_supply_items_subcategory ON supply_items(subcategory);

COMMENT ON COLUMN supply_items.group_name IS 'Top-level group (e.g. Двери, Мебель, Электрика) — matches "Группа/Вид" in spec sheets';
COMMENT ON COLUMN supply_items.subcategory IS 'Subgroup (e.g. Двери распашные, Ручки дверей) — matches "Подгруппа/Спецификация"';
COMMENT ON COLUMN supply_items.order_deadline_override IS 'Manual override for the computed order deadline (otherwise stage.start_date - lead_time_days)';
