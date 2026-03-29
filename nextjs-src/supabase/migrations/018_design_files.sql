-- ============================================================
-- 018: Design files with folder structure and comments
-- ============================================================

-- Design files table
CREATE TABLE IF NOT EXISTS design_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder text NOT NULL CHECK (folder IN ('concept', 'visuals', 'drawings', 'documents')),
  name text NOT NULL,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_files_project ON design_files(project_id);
CREATE INDEX IF NOT EXISTS idx_design_files_folder ON design_files(project_id, folder);

-- Design file comments table
CREATE TABLE IF NOT EXISTS design_file_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES design_files(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_file_comments_file ON design_file_comments(file_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_file_comments ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is owner or team member of a project
-- (designer/assistant role in project_members OR project.owner_id)
-- We reuse existing project_members table for access checks.

-- design_files: SELECT
CREATE POLICY "design_files_select" ON design_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_files.project_id
      AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_files.project_id
      AND p.owner_id = auth.uid()
  )
);

-- design_files: INSERT (owner and team only)
CREATE POLICY "design_files_insert" ON design_files FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_files.project_id
      AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_files.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('designer', 'assistant')
  )
);

-- design_files: DELETE (owner and team only)
CREATE POLICY "design_files_delete" ON design_files FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_files.project_id
      AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_files.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('designer', 'assistant')
  )
);

-- design_file_comments: SELECT
CREATE POLICY "design_file_comments_select" ON design_file_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_file_comments.project_id
      AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_file_comments.project_id
      AND p.owner_id = auth.uid()
  )
);

-- design_file_comments: INSERT (anyone with project access)
CREATE POLICY "design_file_comments_insert" ON design_file_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_file_comments.project_id
      AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_file_comments.project_id
      AND p.owner_id = auth.uid()
  )
);

-- design_file_comments: DELETE (own comments only)
CREATE POLICY "design_file_comments_delete" ON design_file_comments FOR DELETE USING (
  user_id = auth.uid()
);
