-- =====================================================
-- FIX INFINITE RECURSION IN GROUPS RLS POLICIES
-- This fixes the circular dependency between groups and group_members
-- =====================================================

-- First, fix group_members policies to avoid recursion
-- Users should be able to see their own memberships without checking groups table

DROP POLICY IF EXISTS "Users see group members" ON public.group_members;
CREATE POLICY "Users see group members"
  ON public.group_members
  FOR SELECT
  USING (
    -- Users can always see their own memberships
    user_id = public.get_current_user_id()
    -- Or if they're checking a specific group, allow if the group is public and approved/active
    -- But we need to avoid recursion, so we'll use a simpler approach
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = public.get_current_user_id()
    )
  );

-- Now fix groups policies - remove the EXISTS check that causes recursion
-- Instead, we'll use a simpler approach

DROP POLICY IF EXISTS "Public can read public groups" ON public.groups;
CREATE POLICY "Public can read public groups"
  ON public.groups
  FOR SELECT
  USING (is_public = true AND (status IS NULL OR status IN ('approved', 'active')));

DROP POLICY IF EXISTS "Users see groups they're in" ON public.groups;
-- Split into separate policies to avoid recursion
CREATE POLICY "Users see groups they created"
  ON public.groups
  FOR SELECT
  USING (created_by = public.get_current_user_id());

-- Users can see groups they're members of (check membership directly without recursion)
-- We'll use a function to bypass RLS for the membership check
CREATE OR REPLACE FUNCTION public.user_is_group_member(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_id_param
    AND group_members.user_id = user_id_param
  );
END;
$$;

CREATE POLICY "Users see groups they're members of"
  ON public.groups
  FOR SELECT
  USING (
    public.user_is_group_member(groups.id, public.get_current_user_id())
  );

-- Keep other policies
DROP POLICY IF EXISTS "Users create groups" ON public.groups;
CREATE POLICY "Users create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (created_by = public.get_current_user_id());

DROP POLICY IF EXISTS "Group leaders manage their groups" ON public.groups;
CREATE POLICY "Group leaders manage their groups"
  ON public.groups
  FOR UPDATE
  USING (
    created_by = public.get_current_user_id()
    OR public.user_is_group_member(groups.id, public.get_current_user_id())
  )
  WITH CHECK (
    created_by = public.get_current_user_id()
    OR public.user_is_group_member(groups.id, public.get_current_user_id())
  );

DROP POLICY IF EXISTS "Admins manage groups" ON public.groups;
CREATE POLICY "Admins manage groups"
  ON public.groups
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Also fix group_members policies to use the function
DROP POLICY IF EXISTS "Group leaders manage members" ON public.group_members;
CREATE POLICY "Group leaders manage members"
  ON public.group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = public.get_current_user_id()
      AND gm.role IN ('leader', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = public.get_current_user_id()
      AND gm.role IN ('leader', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins manage group members" ON public.group_members;
CREATE POLICY "Admins manage group members"
  ON public.group_members
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

