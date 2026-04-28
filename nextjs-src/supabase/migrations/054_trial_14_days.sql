-- Trial period: 7 → 14 days.
-- 1) Update the trigger so new signups get 14-day trial.
-- 2) Extend existing active trials by +7 days (only those still in 'trial' status,
--    not yet expired) so people who registered yesterday don't get short-changed.

CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at)
  VALUES (NEW.id, 'trial', 'trial', now(), now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_module_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Extend currently-active trial subscriptions by 7 days
UPDATE subscriptions
   SET expires_at = expires_at + interval '7 days'
 WHERE status = 'trial'
   AND plan   = 'trial'
   AND expires_at > now();
