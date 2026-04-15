-- Add attachments JSONB column to visit_reports
-- Stores array of { name, file_url, size, uploaded_at }
ALTER TABLE visit_reports ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
