-- Enhance prayer requests with interactive features
-- Add support for likes, comments, categories, and answered status

-- Add new columns to prayer_requests table
ALTER TABLE public.prayer_requests
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_answered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS answer_description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create prayer_likes table for tracking likes/reactions
CREATE TABLE IF NOT EXISTS public.prayer_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) DEFAULT 'like', -- like, love, support, amen
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prayer_request_id, user_id)
);

-- Create prayer_comments table for comments/replies
CREATE TABLE IF NOT EXISTS public.prayer_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES public.prayer_comments(id) ON DELETE CASCADE, -- For nested replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_likes_request ON public.prayer_likes(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_likes_user ON public.prayer_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_comments_request ON public.prayer_comments(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_comments_user ON public.prayer_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_comments_parent ON public.prayer_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_category ON public.prayer_requests(category);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_answered ON public.prayer_requests(is_answered);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON public.prayer_requests(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prayer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prayer_requests_updated_at ON public.prayer_requests;
CREATE TRIGGER trigger_update_prayer_requests_updated_at
    BEFORE UPDATE ON public.prayer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_prayer_requests_updated_at();

-- Create trigger to update comment_count
CREATE OR REPLACE FUNCTION update_prayer_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.prayer_requests
        SET comment_count = COALESCE(comment_count, 0) + 1
        WHERE id = NEW.prayer_request_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.prayer_requests
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
        WHERE id = OLD.prayer_request_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prayer_comment_count ON public.prayer_comments;
CREATE TRIGGER trigger_update_prayer_comment_count
    AFTER INSERT OR DELETE ON public.prayer_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_prayer_comment_count();

-- Create trigger to update like_count
CREATE OR REPLACE FUNCTION update_prayer_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.prayer_requests
        SET like_count = COALESCE(like_count, 0) + 1
        WHERE id = NEW.prayer_request_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.prayer_requests
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
        WHERE id = OLD.prayer_request_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prayer_like_count ON public.prayer_likes;
CREATE TRIGGER trigger_update_prayer_like_count
    AFTER INSERT OR DELETE ON public.prayer_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_prayer_like_count();

-- Add comments
COMMENT ON TABLE public.prayer_likes IS 'Tracks user likes/reactions on prayer requests';
COMMENT ON TABLE public.prayer_comments IS 'Stores comments and replies on prayer requests';
COMMENT ON COLUMN public.prayer_requests.category IS 'Category of prayer request (healing, guidance, provision, etc.)';
COMMENT ON COLUMN public.prayer_requests.is_answered IS 'Whether the prayer has been answered';
COMMENT ON COLUMN public.prayer_requests.answer_description IS 'Description of how the prayer was answered';
COMMENT ON COLUMN public.prayer_requests.tags IS 'Array of tags for better organization';
COMMENT ON COLUMN public.prayer_requests.like_count IS 'Number of likes/reactions';
COMMENT ON COLUMN public.prayer_requests.comment_count IS 'Number of comments';

