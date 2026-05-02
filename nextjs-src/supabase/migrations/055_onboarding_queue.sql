-- ============================================================
-- 055: AI onboarding upload queue
-- ============================================================
-- Files уходят сюда из массовой загрузки до того, как ИИ их
-- классифицирует и (при высоком confidence) переносит в design_files.
-- Низкий confidence → status='needs_review' → ждёт ручного подтверждения.
-- Excel-комплектация → status='supply_suggested' → CTA в Supply.
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text,
  ai_category text,
  ai_confidence numeric(3,2),
  ai_reasoning text,
  status text NOT NULL CHECK (status IN (
    'pending', 'auto_placed', 'needs_review', 'supply_suggested', 'confirmed', 'rejected'
  )),
  final_category text,
  created_design_file_id uuid REFERENCES design_files(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_onboarding_uploads_project_status
  ON onboarding_uploads(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_uploads_created
  ON onboarding_uploads(created_at)
  WHERE status IN ('needs_review', 'pending', 'supply_suggested');

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE onboarding_uploads ENABLE ROW LEVEL SECURITY;

-- SELECT: designer/assistant в проекте + owner
CREATE POLICY "onboarding_uploads_select" ON onboarding_uploads FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = onboarding_uploads.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('designer', 'assistant')
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = onboarding_uploads.project_id
      AND p.owner_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: только service role (через API роуты)
-- Никаких политик для anon/authenticated → доступ через service-role-key
