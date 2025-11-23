-- =====================================================
-- FORUM TABLES
-- =====================================================

-- Forum Categories Table
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_categories_slug ON public.forum_categories(slug);
CREATE INDEX IF NOT EXISTS idx_forum_categories_is_active ON public.forum_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_forum_categories_order_index ON public.forum_categories(order_index);

-- Forum Topics Table
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_category_id ON public.forum_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_user_id ON public.forum_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_is_pinned ON public.forum_topics(is_pinned);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created_at ON public.forum_topics(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_topics_last_reply_at ON public.forum_topics(last_reply_at);

-- Forum Replies Table
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_id ON public.forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON public.forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON public.forum_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_replies_is_solution ON public.forum_replies(is_solution);

-- Forum Topic Follows (for notifications)
CREATE TABLE IF NOT EXISTS public.forum_topic_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_topic_follows_topic_id ON public.forum_topic_follows(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_follows_user_id ON public.forum_topic_follows(user_id);

-- Forum Reply Likes
CREATE TABLE IF NOT EXISTS public.forum_reply_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_reply_likes_reply_id ON public.forum_reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_reply_likes_user_id ON public.forum_reply_likes(user_id);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topic_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Forum Categories
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read active forum categories" ON public.forum_categories;
DROP POLICY IF EXISTS "Admins manage forum categories" ON public.forum_categories;

-- Public can read active categories
CREATE POLICY "Public can read active forum categories"
  ON public.forum_categories
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins manage forum categories"
  ON public.forum_categories
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for Forum Topics
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read forum topics" ON public.forum_topics;
DROP POLICY IF EXISTS "Users create own forum topics" ON public.forum_topics;
DROP POLICY IF EXISTS "Users update own forum topics" ON public.forum_topics;
DROP POLICY IF EXISTS "Admins manage forum topics" ON public.forum_topics;

-- Public can read topics
CREATE POLICY "Public can read forum topics"
  ON public.forum_topics
  FOR SELECT
  USING (true);

-- Users can create their own topics
CREATE POLICY "Users create own forum topics"
  ON public.forum_topics
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can update their own topics
CREATE POLICY "Users update own forum topics"
  ON public.forum_topics
  FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Function to increment view count (bypasses RLS)
-- Drop function if it exists
DROP FUNCTION IF EXISTS public.increment_forum_topic_view_count(UUID);

CREATE FUNCTION public.increment_forum_topic_view_count(p_topic_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.forum_topics
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    updated_at = now()
  WHERE id = p_topic_id;
END;
$$;

-- Admins can manage all topics
CREATE POLICY "Admins manage forum topics"
  ON public.forum_topics
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for Forum Replies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users create own forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users update own forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users delete own forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Admins manage forum replies" ON public.forum_replies;

-- Public can read replies
CREATE POLICY "Public can read forum replies"
  ON public.forum_replies
  FOR SELECT
  USING (true);

-- Users can create their own replies
CREATE POLICY "Users create own forum replies"
  ON public.forum_replies
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can update their own replies
CREATE POLICY "Users update own forum replies"
  ON public.forum_replies
  FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can delete their own replies
CREATE POLICY "Users delete own forum replies"
  ON public.forum_replies
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- Admins can manage all replies
CREATE POLICY "Admins manage forum replies"
  ON public.forum_replies
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for Forum Topic Follows
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users see own forum topic follows" ON public.forum_topic_follows;
DROP POLICY IF EXISTS "Users create own forum topic follows" ON public.forum_topic_follows;
DROP POLICY IF EXISTS "Users delete own forum topic follows" ON public.forum_topic_follows;
DROP POLICY IF EXISTS "Admins manage forum topic follows" ON public.forum_topic_follows;

-- Users can see their own follows
CREATE POLICY "Users see own forum topic follows"
  ON public.forum_topic_follows
  FOR SELECT
  USING (user_id = public.get_current_user_id());

-- Users can create their own follows
CREATE POLICY "Users create own forum topic follows"
  ON public.forum_topic_follows
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can delete their own follows
CREATE POLICY "Users delete own forum topic follows"
  ON public.forum_topic_follows
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- Admins can manage all follows
CREATE POLICY "Admins manage forum topic follows"
  ON public.forum_topic_follows
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for Forum Reply Likes
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users see forum reply likes" ON public.forum_reply_likes;
DROP POLICY IF EXISTS "Users create own forum reply likes" ON public.forum_reply_likes;
DROP POLICY IF EXISTS "Users delete own forum reply likes" ON public.forum_reply_likes;
DROP POLICY IF EXISTS "Admins manage forum reply likes" ON public.forum_reply_likes;

-- Users can see all likes
CREATE POLICY "Users see forum reply likes"
  ON public.forum_reply_likes
  FOR SELECT
  USING (true);

-- Users can create their own likes
CREATE POLICY "Users create own forum reply likes"
  ON public.forum_reply_likes
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can delete their own likes
CREATE POLICY "Users delete own forum reply likes"
  ON public.forum_reply_likes
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- Admins can manage all likes
CREATE POLICY "Admins manage forum reply likes"
  ON public.forum_reply_likes
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Function to update topic reply count and last_reply_at
-- Drop function if it exists
DROP FUNCTION IF EXISTS public.update_forum_topic_reply_stats();

CREATE FUNCTION public.update_forum_topic_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics
    SET 
      reply_count = (SELECT COUNT(*) FROM public.forum_replies WHERE topic_id = NEW.topic_id),
      last_reply_at = NEW.created_at
    WHERE id = NEW.topic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics
    SET 
      reply_count = (SELECT COUNT(*) FROM public.forum_replies WHERE topic_id = OLD.topic_id),
      last_reply_at = (SELECT MAX(created_at) FROM public.forum_replies WHERE topic_id = OLD.topic_id)
    WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update topic stats when replies are added/deleted
DROP TRIGGER IF EXISTS trigger_update_forum_topic_reply_stats ON public.forum_replies;
CREATE TRIGGER trigger_update_forum_topic_reply_stats
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_forum_topic_reply_stats();

