-- Sprint: Privacy policy — record consent timestamp
-- Adds privacy_accepted_at to profiles. Set on signup when user checks the
-- "Я принимаю политику конфиденциальности" checkbox; NULL for legacy accounts.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;

COMMENT ON COLUMN profiles.privacy_accepted_at IS
  'Timestamp when user accepted the privacy policy during signup. NULL = legacy (pre-policy) account.';
