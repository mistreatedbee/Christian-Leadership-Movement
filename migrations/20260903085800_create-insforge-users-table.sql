-- The InsForge SDK's own Auth.getCurrentUser()/getProfile()/setProfile() hardcode
-- queries against a public.users(id) table (see @insforge/sdk dist/index.js:554,588,657)
-- as a platform convention - every InsForge project is expected to have one. This
-- project never had it (also referenced as an FK target by several of this repo's
-- own legacy migration .sql files that were apparently never applied), so every
-- session restore's getCurrentUser() call errored with "relation does not exist"
-- (not the harmless "no rows" PGRST116 case), which loadAuthState() in @insforge/react
-- treats as "no valid profile" and forcibly signs the user back out - i.e. login
-- appeared to succeed for a moment and then silently reverted.
--
-- The app's real, richer profile data lives in public.user_profiles (see
-- 20260903075214_add-missing-user-profile-columns.sql) - this table only needs to
-- exist and be queryable so the SDK's internal check gets a normal "no rows" result
-- instead of a hard schema error.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own row" ON public.users;
CREATE POLICY "Users can view own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own row" ON public.users;
CREATE POLICY "Users can insert own row" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins view all users" ON public.users;
CREATE POLICY "Admins view all users" ON public.users
  FOR SELECT USING (is_current_user_admin());

DROP POLICY IF EXISTS "Admins update all users" ON public.users;
CREATE POLICY "Admins update all users" ON public.users
  FOR UPDATE USING (is_current_user_admin());
