-- Add supervision_config JSONB column to projects table
-- Stores: visit_frequency, custom_visit_day, invoice_day, invoice_reminder_days, extra_visit_cost
ALTER TABLE projects ADD COLUMN IF NOT EXISTS supervision_config jsonb DEFAULT NULL;
