-- 031: Kind → Stage mapping dictionary (per-user)
-- Maps category (kind) text to stage name for auto-fill during import

CREATE TABLE IF NOT EXISTS kind_stage_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, kind)
);

-- RLS: per-user access only
ALTER TABLE kind_stage_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ksm_select"
  ON kind_stage_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ksm_insert"
  ON kind_stage_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ksm_update"
  ON kind_stage_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "ksm_delete"
  ON kind_stage_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_ksm_user ON kind_stage_mappings(user_id);
