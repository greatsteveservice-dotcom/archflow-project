-- Add url column to supply_items for product/website link.
-- Used both in manual entry and Excel import (replaces the previous
-- "link → notes" concatenation in SupplyImport).
ALTER TABLE supply_items
  ADD COLUMN IF NOT EXISTS url TEXT;
