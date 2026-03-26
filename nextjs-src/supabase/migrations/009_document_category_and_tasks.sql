-- ============================================================
-- Migration 009: Document categories + Tasks table
-- ============================================================

-- 1. Enum for document categories
CREATE TYPE document_category AS ENUM (
  'design_project', 'visualizations', 'engineering',
  'contract', 'schedule', 'payments', 'acts', 'invoices'
);

-- 2. Add category column to documents
ALTER TABLE documents ADD COLUMN category document_category DEFAULT 'design_project';

-- 3. Enum for task statuses
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'done');

-- 4. Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  photo_record_id UUID REFERENCES photo_records(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS on tasks (same pattern as visits)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  project_id IN (SELECT get_user_project_ids())
);

CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  project_id IN (SELECT get_user_project_ids())
);

CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  project_id IN (SELECT get_user_project_ids())
);

CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  project_id IN (SELECT get_user_project_ids())
);

-- 6. Indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_photo ON tasks(photo_record_id);
CREATE INDEX idx_documents_category ON documents(project_id, category);

-- 7. updated_at trigger (reuse from 001)
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. Add webcam_url to projects (for CameraView)
ALTER TABLE projects ADD COLUMN webcam_url TEXT;
