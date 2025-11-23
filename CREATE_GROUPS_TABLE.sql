-- =====================================================
-- CREATE GROUPS TABLES
-- This script creates the groups, group_members, group_events, and group_messages tables
-- Run this in your InsForge SQL Editor
-- =====================================================

-- Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT CHECK (group_type IN ('ministry', 'small_group', 'committee', 'team')),
  image_url TEXT,
  image_key TEXT,
  is_public BOOLEAN DEFAULT false,
  max_members INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_group_type ON public.groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_is_public ON public.groups(is_public);
CREATE INDEX IF NOT EXISTS idx_groups_status ON public.groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at);

-- Group Members Table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create indexes for group members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON public.group_members(role);

-- Group Events Table (links groups to events)
CREATE TABLE IF NOT EXISTS public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, event_id)
);

-- Create indexes for group events
CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_event_id ON public.group_events(event_id);

-- Group Messages Table (separate from forum)
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for group messages
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON public.group_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR GROUPS
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read public groups" ON public.groups;
DROP POLICY IF EXISTS "Users see groups they're in" ON public.groups;
DROP POLICY IF EXISTS "Users create groups" ON public.groups;
DROP POLICY IF EXISTS "Group leaders manage their groups" ON public.groups;
DROP POLICY IF EXISTS "Admins manage groups" ON public.groups;

-- Public can read public approved/active groups
CREATE POLICY "Public can read public groups"
  ON public.groups
  FOR SELECT
  USING (is_public = true AND status IN ('approved', 'active'));

-- Users can see groups they're members of (any visibility) or groups they created (any status)
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

-- Admins can see and manage all groups
CREATE POLICY "Admins manage groups"
  ON public.groups
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- RLS POLICIES FOR GROUP MEMBERS
-- =====================================================

-- Drop existing policies if they exist
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

-- Drop existing policies if they exist
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

-- Drop existing policies if they exist
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

