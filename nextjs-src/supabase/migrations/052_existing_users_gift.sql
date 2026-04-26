-- Give 6 months subscription to everyone who already registered before billing launch.
-- Safe to run multiple times (ON CONFLICT).

INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at)
SELECT
  id,
  'halfyear',
  'active',
  now(),
  now() + interval '6 months'
FROM auth.users
ON CONFLICT (user_id) DO UPDATE
  SET plan = 'halfyear',
      status = 'active',
      started_at = now(),
      expires_at = now() + interval '6 months',
      updated_at = now();
