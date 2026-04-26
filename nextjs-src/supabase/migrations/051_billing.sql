-- Billing: subscriptions + user module visibility settings
-- Only designers are gated by subscription; trial created for everyone,
-- but useSubscription hook returns canEdit=true for non-designers.

CREATE TABLE IF NOT EXISTS subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan          text NOT NULL CHECK (plan IN ('trial', 'month', 'halfyear', 'year')),
  status        text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  yookassa_payment_id text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_expires_idx ON subscriptions(expires_at);

CREATE TABLE IF NOT EXISTS user_module_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  modules    jsonb NOT NULL DEFAULT '{"design":true,"supervision":true,"supply":true,"chat":true,"assistant":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger: on new auth.users → create 7-day trial + default module settings
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at)
  VALUES (NEW.id, 'trial', 'trial', now(), now() + interval '7 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_module_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created_billing ON auth.users;
CREATE TRIGGER on_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();

-- avatar_url on profiles (if not there already)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_subscription_select" ON subscriptions;
CREATE POLICY "user_own_subscription_select" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE user_module_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_modules_select" ON user_module_settings;
CREATE POLICY "user_own_modules_select" ON user_module_settings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_own_modules_update" ON user_module_settings;
CREATE POLICY "user_own_modules_update" ON user_module_settings
  FOR UPDATE USING (auth.uid() = user_id);
