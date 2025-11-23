-- =====================================================
-- ADD STATUS COLUMN TO GROUPS TABLE
-- Run this if the groups table exists but doesn't have the status column
-- =====================================================

-- Add status column if it doesn't exist
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive'));

-- Update existing groups to have 'approved' status (assuming they were already active)
-- Change this to 'pending' if you want to review existing groups
UPDATE public.groups 
SET status = 'approved' 
WHERE status IS NULL OR status = '';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_status ON public.groups(status);

-- Update RLS policies to handle status field
DROP POLICY IF EXISTS "Public can read public groups" ON public.groups;
CREATE POLICY "Public can read public groups"
  ON public.groups
  FOR SELECT
  USING (is_public = true AND status IN ('approved', 'active'));

DROP POLICY IF EXISTS "Users see groups they're in" ON public.groups;
CREATE POLICY "Users see groups they're in"
  ON public.groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = public.get_current_user_id()
    )
    OR created_by = public.get_current_user_id()
    OR (is_public = true AND status IN ('approved', 'active'))
  );

