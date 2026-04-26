-- User activity sessions for "time in service" analytics
-- Each session = consecutive activity pings within 3-minute window
-- Duration per session = last_ping_at - started_at

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_ping_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_started_idx
  ON user_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS user_sessions_last_ping_idx
  ON user_sessions(last_ping_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own sessions only. Writes go through service-role API.
DROP POLICY IF EXISTS "user_own_sessions_select" ON user_sessions;
CREATE POLICY "user_own_sessions_select" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Aggregation RPC for analytics cron
CREATE OR REPLACE FUNCTION get_user_durations(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(user_id uuid, seconds bigint, sessions_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    user_id,
    COALESCE(SUM(EXTRACT(EPOCH FROM (last_ping_at - started_at))), 0)::bigint AS seconds,
    COUNT(*)::bigint AS sessions_count
  FROM user_sessions
  WHERE started_at >= p_from AND started_at < p_to
  GROUP BY user_id;
$$;

REVOKE ALL ON FUNCTION get_user_durations(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_durations(timestamptz, timestamptz) TO service_role;
