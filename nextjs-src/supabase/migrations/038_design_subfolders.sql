-- Design subfolders: user-created folders within each design category
-- Adds subfolder support to design_files

-- 1. Subfolder column on design_files
ALTER TABLE design_files ADD COLUMN IF NOT EXISTS subfolder text DEFAULT NULL;

-- 2. Subfolders registry (persists empty folders)
CREATE TABLE IF NOT EXISTS design_subfolders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder text NOT NULL,        -- DesignFolder category (e.g. 'visuals')
  name text NOT NULL,
  position int DEFAULT 0,      -- for ordering
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, folder, name)
);

-- RLS
ALTER TABLE design_subfolders ENABLE ROW LEVEL SECURITY;

-- SELECT: project members + owner
CREATE POLICY "subfolders_select" ON design_subfolders FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- INSERT: designer/assistant + owner
CREATE POLICY "subfolders_insert" ON design_subfolders FOR INSERT WITH CHECK (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.member_role IN ('designer', 'assistant')
  )
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- UPDATE: designer/assistant + owner
CREATE POLICY "subfolders_update" ON design_subfolders FOR UPDATE USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.member_role IN ('designer', 'assistant')
  )
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- DELETE: designer/assistant + owner
CREATE POLICY "subfolders_delete" ON design_subfolders FOR DELETE USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.member_role IN ('designer', 'assistant')
  )
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_design_subfolders_project_folder
  ON design_subfolders(project_id, folder);

CREATE INDEX IF NOT EXISTS idx_design_files_subfolder
  ON design_files(subfolder);
