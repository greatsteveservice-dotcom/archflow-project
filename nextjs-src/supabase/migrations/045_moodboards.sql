-- 045: Moodboard tables for visual concept boards
-- Part of Moodboard MVP feature

-- Moodboard (one or many per project)
CREATE TABLE moodboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Без названия',
  description text,
  room_type text,
  style_tags text[] DEFAULT '{}',
  color_palette jsonb DEFAULT '[]',
  is_public boolean DEFAULT false,
  public_token text UNIQUE,
  client_can_comment boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_moodboards_project ON moodboards(project_id);

-- Moodboard items (images, text notes, color swatches)
CREATE TABLE moodboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moodboard_id uuid NOT NULL REFERENCES moodboards(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'text_note', 'color_swatch')),
  position integer NOT NULL DEFAULT 0,
  -- image fields
  image_url text,
  thumbnail_url text,
  file_path text,
  title text,
  source_url text,
  source_platform text,
  dominant_colors jsonb,
  -- text note fields
  text_content text,
  text_color text DEFAULT '#111111',
  bg_color text DEFAULT '#F6F6F4',
  -- color swatch fields
  color_hex text,
  color_name text,
  -- client feedback
  client_reaction text CHECK (client_reaction IS NULL OR client_reaction IN ('like', 'dislike', 'maybe')),
  client_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_moodboard_items_board ON moodboard_items(moodboard_id, position);

-- Comments on moodboard (from designer or client)
CREATE TABLE moodboard_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moodboard_id uuid NOT NULL REFERENCES moodboards(id) ON DELETE CASCADE,
  item_id uuid REFERENCES moodboard_items(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('designer', 'client', 'guest')),
  author_name text,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_moodboard_comments_board ON moodboard_comments(moodboard_id);

-- RLS
ALTER TABLE moodboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE moodboard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE moodboard_comments ENABLE ROW LEVEL SECURITY;

-- moodboards: SELECT for project members + owner
CREATE POLICY "moodboards_select" ON moodboards FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = moodboards.project_id AND pm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = moodboards.project_id AND p.owner_id = auth.uid())
);

-- moodboards: INSERT for designer/assistant + owner
CREATE POLICY "moodboards_insert" ON moodboards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = moodboards.project_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = moodboards.project_id AND pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant'))
);

-- moodboards: UPDATE for designer/assistant + owner
CREATE POLICY "moodboards_update" ON moodboards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = moodboards.project_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = moodboards.project_id AND pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant'))
);

-- moodboards: DELETE for designer/assistant + owner
CREATE POLICY "moodboards_delete" ON moodboards FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = moodboards.project_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = moodboards.project_id AND pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant'))
);

-- moodboard_items: SELECT via board membership chain
CREATE POLICY "moodboard_items_select" ON moodboard_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM moodboards mb
    LEFT JOIN project_members pm ON pm.project_id = mb.project_id AND pm.user_id = auth.uid()
    LEFT JOIN projects p ON p.id = mb.project_id AND p.owner_id = auth.uid()
    WHERE mb.id = moodboard_items.moodboard_id AND (pm.user_id IS NOT NULL OR p.owner_id IS NOT NULL)
  )
);

-- moodboard_items: INSERT for designer/assistant
CREATE POLICY "moodboard_items_insert" ON moodboard_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM moodboards mb
    LEFT JOIN projects p ON p.id = mb.project_id AND p.owner_id = auth.uid()
    LEFT JOIN project_members pm ON pm.project_id = mb.project_id AND pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant')
    WHERE mb.id = moodboard_items.moodboard_id AND (p.owner_id IS NOT NULL OR pm.user_id IS NOT NULL)
  )
);

-- moodboard_items: UPDATE for designer/assistant
CREATE POLICY "moodboard_items_update" ON moodboard_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM moodboards mb
    LEFT JOIN projects p ON p.id = mb.project_id AND p.owner_id = auth.uid()
    LEFT JOIN project_members pm ON pm.project_id = mb.project_id AND pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant')
    WHERE mb.id = moodboard_items.moodboard_id AND (p.owner_id IS NOT NULL OR pm.user_id IS NOT NULL)
  )
);

-- moodboard_items: DELETE for designer/assistant
CREATE POLICY "moodboard_items_delete" ON moodboard_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM moodboards mb
    LEFT JOIN projects p ON p.id = mb.project_id AND p.owner_id = auth.uid()
    LEFT JOIN project_members pm ON pm.project_id = mb.project_id AND pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant')
    WHERE mb.id = moodboard_items.moodboard_id AND (p.owner_id IS NOT NULL OR pm.user_id IS NOT NULL)
  )
);

-- moodboard_comments: SELECT for project members
CREATE POLICY "moodboard_comments_select" ON moodboard_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM moodboards mb
    LEFT JOIN project_members pm ON pm.project_id = mb.project_id AND pm.user_id = auth.uid()
    LEFT JOIN projects p ON p.id = mb.project_id AND p.owner_id = auth.uid()
    WHERE mb.id = moodboard_comments.moodboard_id AND (pm.user_id IS NOT NULL OR p.owner_id IS NOT NULL)
  )
);

-- moodboard_comments: INSERT for project members
CREATE POLICY "moodboard_comments_insert" ON moodboard_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM moodboards mb
    LEFT JOIN project_members pm ON pm.project_id = mb.project_id AND pm.user_id = auth.uid()
    LEFT JOIN projects p ON p.id = mb.project_id AND p.owner_id = auth.uid()
    WHERE mb.id = moodboard_comments.moodboard_id AND (pm.user_id IS NOT NULL OR p.owner_id IS NOT NULL)
  )
);

-- moodboard_comments: DELETE own comments
CREATE POLICY "moodboard_comments_delete" ON moodboard_comments FOR DELETE USING (
  author_user_id = auth.uid()
);
