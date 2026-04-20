-- 047: Canvas mode for moodboards
-- Adds spatial canvas support: sections (room zones), canvas positions on items

-- ═══ Moodboard sections (room zones on canvas) ═══
CREATE TABLE IF NOT EXISTS moodboard_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moodboard_id uuid NOT NULL REFERENCES moodboards(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Новая секция',
  area_label text,
  canvas_x float NOT NULL DEFAULT 100,
  canvas_y float NOT NULL DEFAULT 100,
  canvas_w float NOT NULL DEFAULT 500,
  canvas_h float NOT NULL DEFAULT 400,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodboard_sections_board ON moodboard_sections(moodboard_id);

-- ═══ Canvas position fields on items ═══
ALTER TABLE moodboard_items
  ADD COLUMN IF NOT EXISTS canvas_x float,
  ADD COLUMN IF NOT EXISTS canvas_y float,
  ADD COLUMN IF NOT EXISTS canvas_w float DEFAULT 200,
  ADD COLUMN IF NOT EXISTS canvas_h float DEFAULT 200,
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES moodboard_sections(id) ON DELETE SET NULL;

-- Extend item type check to include 'arrow'
ALTER TABLE moodboard_items DROP CONSTRAINT IF EXISTS moodboard_items_type_check;
ALTER TABLE moodboard_items ADD CONSTRAINT moodboard_items_type_check
  CHECK (type IN ('image','text_note','color_swatch','arrow'));

-- Canvas viewport state per moodboard
ALTER TABLE moodboards
  ADD COLUMN IF NOT EXISTS canvas_viewport jsonb DEFAULT '{"x":0,"y":0,"scale":1}';

-- ═══ RLS for moodboard_sections ═══
ALTER TABLE moodboard_sections ENABLE ROW LEVEL SECURITY;

-- Select: project members can view
CREATE POLICY "sections_select_members" ON moodboard_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM moodboards mb
      JOIN project_members pm ON pm.project_id = mb.project_id
      WHERE mb.id = moodboard_sections.moodboard_id
        AND pm.user_id = auth.uid()
    )
  );

-- Select: public boards
CREATE POLICY "sections_select_public" ON moodboard_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM moodboards mb
      WHERE mb.id = moodboard_sections.moodboard_id
        AND mb.is_public = true
    )
  );

-- Insert: designers and assistants
CREATE POLICY "sections_insert_team" ON moodboard_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM moodboards mb
      JOIN project_members pm ON pm.project_id = mb.project_id
      WHERE mb.id = moodboard_sections.moodboard_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('designer','assistant')
    )
  );

-- Update: designers and assistants
CREATE POLICY "sections_update_team" ON moodboard_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM moodboards mb
      JOIN project_members pm ON pm.project_id = mb.project_id
      WHERE mb.id = moodboard_sections.moodboard_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('designer','assistant')
    )
  );

-- Delete: designers and assistants
CREATE POLICY "sections_delete_team" ON moodboard_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM moodboards mb
      JOIN project_members pm ON pm.project_id = mb.project_id
      WHERE mb.id = moodboard_sections.moodboard_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('designer','assistant')
    )
  );
