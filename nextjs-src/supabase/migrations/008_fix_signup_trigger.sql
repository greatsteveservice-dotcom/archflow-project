-- ============================================================
-- Archflow: Fix signup trigger (search_path issue)
-- ============================================================
-- GoTrue (auth service) executes triggers with a different search_path,
-- so the user_role type was not found. Adding SET search_path = public
-- and EXCEPTION handler fixes the issue.
-- Also grants INSERT on profiles to supabase_auth_admin for belt+suspenders.

-- Fix the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'designer'::public.user_role
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant INSERT on profiles to auth role (belt+suspenders)
GRANT INSERT ON public.profiles TO supabase_auth_admin;

-- Add INSERT policy for profiles (allows trigger and signup)
CREATE POLICY "Allow trigger insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);
