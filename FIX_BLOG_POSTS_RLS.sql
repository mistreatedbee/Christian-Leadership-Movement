-- Fix RLS policies for blog_posts to allow admins to manage posts
-- This ensures the admin policy uses the same function as other tables

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users create blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins manage blog" ON public.blog_posts;

-- Public can read published blog posts
CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- Users can create their own blog posts
CREATE POLICY "Users create blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (author_id = public.get_current_user_id());

-- Admins can manage all blog posts (using the same admin check function)
CREATE POLICY "Admins manage blog"
  ON public.blog_posts
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

