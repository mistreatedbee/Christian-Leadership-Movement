-- Registration writes first_name/last_name/gender into user_profiles, but those
-- columns never existed on the table, so every signup silently dropped that data
-- (insert failed, fell back to an update that also failed since no row existed yet).
-- AdminProfilePage also needs bio/avatar_url, previously (and wrongly) written to a
-- nonexistent public.users table, which made every admin profile save fail outright.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;
