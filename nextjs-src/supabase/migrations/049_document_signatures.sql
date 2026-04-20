-- 049: Electronic signatures via Podpislon
-- Tracks signature requests sent via Podpislon API and their status

CREATE TABLE IF NOT EXISTS document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES design_files(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  podpislon_doc_id text NOT NULL,
  signer_name text,
  signer_last_name text,
  signer_phone text,
  -- sent | viewed | signed | cancelled
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'signed', 'cancelled')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  signed_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_file ON document_signatures(file_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_project ON document_signatures(project_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_doc ON document_signatures(podpislon_doc_id);

-- Signature state on the source file
ALTER TABLE design_files
  ADD COLUMN IF NOT EXISTS signature_status text
  CHECK (signature_status IN ('none','sent','viewed','signed','cancelled'));

-- RLS
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sig_select_members" ON document_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = document_signatures.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "sig_insert_designer" ON document_signatures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = document_signatures.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('designer','assistant')
    )
  );

CREATE POLICY "sig_update_designer" ON document_signatures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = document_signatures.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('designer','assistant')
    )
  );
