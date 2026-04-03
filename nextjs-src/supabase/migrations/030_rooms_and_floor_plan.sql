-- 030: Add rooms to supply module
-- 1. room field on supply_items
-- 2. project_rooms table

-- Add room column to supply_items
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS room TEXT;

-- Create project_rooms table
CREATE TABLE IF NOT EXISTS project_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area NUMERIC,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for project_rooms
ALTER TABLE project_rooms ENABLE ROW LEVEL SECURITY;

-- SELECT: project members can view
CREATE POLICY "project_rooms_select"
  ON project_rooms FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

-- INSERT: authenticated users for their projects
CREATE POLICY "project_rooms_insert"
  ON project_rooms FOR INSERT
  WITH CHECK (project_id IN (SELECT get_user_project_ids()));

-- UPDATE: authenticated users for their projects
CREATE POLICY "project_rooms_update"
  ON project_rooms FOR UPDATE
  USING (project_id IN (SELECT get_user_project_ids()));

-- DELETE: authenticated users for their projects
CREATE POLICY "project_rooms_delete"
  ON project_rooms FOR DELETE
  USING (project_id IN (SELECT get_user_project_ids()));

-- Index
CREATE INDEX IF NOT EXISTS idx_project_rooms_project ON project_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_supply_items_room ON supply_items(room);
