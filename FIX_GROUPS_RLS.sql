-- Fix RLS policies for groups to allow admins to see all groups
-- This ensures the admin policy uses the same function as other tables
-- NOTE: This script assumes the groups tables already exist
-- If you get "relation does not exist" error, run CREATE_GROUPS_TABLE.sql first

-- =====================================================
-- RLS POLICIES FOR GROUPS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read public groups" ON public.groups;
DROP POLICY IF EXISTS "Users see groups they're in" ON public.groups;
DROP POLICY IF EXISTS "Users create groups" ON public.groups;
DROP POLICY IF EXISTS "Group leaders manage their groups" ON public.groups;
DROP POLICY IF EXISTS "Admins manage groups" ON public.groups;

-- Public can read public groups
CREATE POLICY "Public can read public groups"
  ON public.groups
  FOR SELECT
  USING (is_public = true);

-- Users can see groups they're members of (any visibility)
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
  );

-- Users can create groups
CREATE POLICY "Users create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (created_by = public.get_current_user_id());

-- Group leaders/admins can update their groups
CREATE POLICY "Group leaders manage their groups"
  ON public.groups
  FOR UPDATE
  USING (
    created_by = public.get_current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = public.get_current_user_id()
      AND group_members.role IN ('leader', 'admin')
    )
  )
  WITH CHECK (
    created_by = public.get_current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = public.get_current_user_id()
      AND group_members.role IN ('leader', 'admin')
    )
  );

-- Admins can see and manage all groups (using the same admin check function)
CREATE POLICY "Admins manage groups"
  ON public.groups
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- RLS POLICIES FOR GROUP MEMBERS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see group members" ON public.group_members;
DROP POLICY IF EXISTS "Users join groups" ON public.group_members;
DROP POLICY IF EXISTS "Group leaders manage members" ON public.group_members;
DROP POLICY IF EXISTS "Admins manage group members" ON public.group_members;

-- Users can see members of groups they're in
CREATE POLICY "Users see group members"
  ON public.group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND (groups.is_public = true OR groups.created_by = public.get_current_user_id())
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = public.get_current_user_id()
    )
  );

-- Users can join groups (if public or invited)
CREATE POLICY "Users join groups"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    user_id = public.get_current_user_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.groups
        WHERE groups.id = group_members.group_id
        AND groups.is_public = true
      )
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = group_members.group_id
        AND gm.user_id = public.get_current_user_id()
        AND gm.role IN ('leader', 'admin')
      )
    )
  );

-- Group leaders can manage members
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

-- Admins can manage all group members
CREATE POLICY "Admins manage group members"
  ON public.group_members
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- RLS POLICIES FOR GROUP EVENTS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see group events" ON public.group_events;
DROP POLICY IF EXISTS "Group leaders create group events" ON public.group_events;
DROP POLICY IF EXISTS "Admins manage group events" ON public.group_events;

-- Users can see events for groups they're in
CREATE POLICY "Users see group events"
  ON public.group_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = public.get_current_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_events.group_id
      AND groups.is_public = true
    )
  );

-- Group leaders can create group events
CREATE POLICY "Group leaders create group events"
  ON public.group_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = public.get_current_user_id()
      AND group_members.role IN ('leader', 'admin')
    )
  );

-- Admins can manage all group events
CREATE POLICY "Admins manage group events"
  ON public.group_events
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- RLS POLICIES FOR GROUP MESSAGES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Group members create messages" ON public.group_messages;
DROP POLICY IF EXISTS "Admins manage group messages" ON public.group_messages;

-- Users can see messages for groups they're in
CREATE POLICY "Users see group messages"
  ON public.group_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = public.get_current_user_id()
    )
  );

-- Group members can create messages
CREATE POLICY "Group members create messages"
  ON public.group_messages
  FOR INSERT
  WITH CHECK (
    user_id = public.get_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = public.get_current_user_id()
    )
  );

-- Admins can manage all group messages
CREATE POLICY "Admins manage group messages"
  ON public.group_messages
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

