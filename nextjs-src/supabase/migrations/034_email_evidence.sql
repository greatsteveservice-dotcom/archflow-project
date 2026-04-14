-- ============================================================
-- Migration 034: Email Evidence Chain
-- ============================================================
-- Доказательная цепочка email-доставки отчётов авторского надзора.
-- Таблицы: email_sends (отправки), email_events (audit log вебхуков).
-- Новые поля в visit_reports: content_hash, hash_computed_at.
-- ============================================================

-- 1. Enum for email delivery status
DO $$ BEGIN
  CREATE TYPE email_delivery_status AS ENUM (
    'sending',
    'sent',
    'delivered',
    'bounced',
    'opened',
    'confirmed',
    'auto_accepted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. email_sends — each report email dispatch
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
  resend_email_id TEXT,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES profiles(id),
  status email_delivery_status NOT NULL DEFAULT 'sending',
  content_hash TEXT NOT NULL,
  tracking_token TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES profiles(id),
  auto_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_report ON email_sends(report_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_project ON email_sends(project_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient ON email_sends(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_token ON email_sends(tracking_token);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);

-- 3. email_events — immutable audit log of webhook events
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  resend_email_id TEXT,
  event_type TEXT NOT NULL,
  raw_payload JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_send ON email_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

-- 4. Add content_hash fields to visit_reports
ALTER TABLE visit_reports ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE visit_reports ADD COLUMN IF NOT EXISTS hash_computed_at TIMESTAMPTZ;

-- ============================================================
-- RLS: email_sends
-- ============================================================
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Designers / team: see all sends for their projects
CREATE POLICY "email_sends_team_select" ON email_sends FOR SELECT
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

-- Clients: see only their own sends
CREATE POLICY "email_sends_client_select" ON email_sends FOR SELECT
  USING (
    recipient_user_id = auth.uid()
    AND project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

-- Insert/update only via service role (API routes)
-- No user-facing insert/update policies needed

-- ============================================================
-- RLS: email_events
-- ============================================================
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Team can read events for sends they can see
CREATE POLICY "email_events_team_select" ON email_events FOR SELECT
  USING (email_send_id IN (
    SELECT es.id FROM email_sends es
    WHERE es.project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
    )
  ));

-- Clients can read events for their own sends
CREATE POLICY "email_events_client_select" ON email_events FOR SELECT
  USING (email_send_id IN (
    SELECT es.id FROM email_sends es
    WHERE es.recipient_user_id = auth.uid()
  ));

-- No insert/update/delete policies for users — writes only via service role
