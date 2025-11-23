-- Create blog tables and RLS policies
-- Run this script in your InsForge SQL Editor

-- =====================================================
-- BLOG/NEWS SECTION
-- =====================================================

-- Blog categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blog tags table
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  featured_image_key TEXT,
  post_type TEXT DEFAULT 'post' CHECK (post_type IN ('post', 'news', 'announcement')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blog post tags (many-to-many)
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_type ON public.blog_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON public.blog_post_tags(tag_id);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Blog categories (public read, admin manage)
DROP POLICY IF EXISTS "Public can read blog categories" ON public.blog_categories;
CREATE POLICY "Public can read blog categories"
  ON public.blog_categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage blog categories" ON public.blog_categories;
CREATE POLICY "Admins manage blog categories"
  ON public.blog_categories
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Blog tags (public read, admin manage)
DROP POLICY IF EXISTS "Public can read blog tags" ON public.blog_tags;
CREATE POLICY "Public can read blog tags"
  ON public.blog_tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage blog tags" ON public.blog_tags;
CREATE POLICY "Admins manage blog tags"
  ON public.blog_tags
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Blog posts (public read published, users create own, admins manage all)
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Users create blog posts" ON public.blog_posts;
CREATE POLICY "Users create blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (author_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage blog" ON public.blog_posts;
CREATE POLICY "Admins manage blog"
  ON public.blog_posts
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Blog post tags (public read, admin manage)
DROP POLICY IF EXISTS "Public can read blog post tags" ON public.blog_post_tags;
CREATE POLICY "Public can read blog post tags"
  ON public.blog_post_tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage blog post tags" ON public.blog_post_tags;
CREATE POLICY "Admins manage blog post tags"
  ON public.blog_post_tags
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- The blog tables have been created with proper RLS policies.
-- Admins can now create, edit, and manage blog posts.
-- Users can see published posts on the /blog page.
-- =====================================================

