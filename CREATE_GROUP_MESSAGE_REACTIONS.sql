-- =====================================================
-- CREATE GROUP MESSAGE REACTIONS AND REPLIES TABLES
-- This adds reactions and replies functionality to group messages
-- =====================================================

-- Group Message Reactions Table
CREATE TABLE IF NOT EXISTS public.group_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_message_id ON public.group_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_user_id ON public.group_message_reactions(user_id);

-- Group Message Replies Table
CREATE TABLE IF NOT EXISTS public.group_message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_message_replies_message_id ON public.group_message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_replies_user_id ON public.group_message_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_group_message_replies_created_at ON public.group_message_replies(created_at);

-- Enable Row Level Security
ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_replies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR GROUP MESSAGE REACTIONS
-- =====================================================

-- Users can see reactions on messages in groups they're members of
CREATE POLICY "Users see group message reactions"
  ON public.group_message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = group_message_reactions.message_id
      AND gmem.user_id = public.get_current_user_id()
    )
  );

-- Users can create reactions on messages in groups they're members of
CREATE POLICY "Users create group message reactions"
  ON public.group_message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = public.get_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = group_message_reactions.message_id
      AND gmem.user_id = public.get_current_user_id()
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users delete own reactions"
  ON public.group_message_reactions
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- Admins can manage all reactions
CREATE POLICY "Admins manage group message reactions"
  ON public.group_message_reactions
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- RLS POLICIES FOR GROUP MESSAGE REPLIES
-- =====================================================

-- Users can see replies on messages in groups they're members of
CREATE POLICY "Users see group message replies"
  ON public.group_message_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = group_message_replies.message_id
      AND gmem.user_id = public.get_current_user_id()
    )
  );

-- Users can create replies on messages in groups they're members of
CREATE POLICY "Users create group message replies"
  ON public.group_message_replies
  FOR INSERT
  WITH CHECK (
    user_id = public.get_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = group_message_replies.message_id
      AND gmem.user_id = public.get_current_user_id()
    )
  );

-- Users can update their own replies
CREATE POLICY "Users update own replies"
  ON public.group_message_replies
  FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can delete their own replies
CREATE POLICY "Users delete own replies"
  ON public.group_message_replies
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- Admins can manage all replies
CREATE POLICY "Admins manage group message replies"
  ON public.group_message_replies
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

