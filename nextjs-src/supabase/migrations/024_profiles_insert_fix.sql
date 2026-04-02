-- 024: Fix profiles INSERT RLS — restrict to own row only
-- Was: WITH CHECK (true) — any user could insert arbitrary profiles
-- Fix: WITH CHECK (auth.uid() = id) — can only create own profile
DROP POLICY IF EXISTS "Allow trigger insert profiles" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
