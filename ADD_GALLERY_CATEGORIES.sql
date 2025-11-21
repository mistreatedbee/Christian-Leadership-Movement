-- Add Gallery Categories Support
-- Run this in your InsForge SQL Editor

-- Create gallery_categories table
CREATE TABLE IF NOT EXISTS public.gallery_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add category_id to gallery table
ALTER TABLE public.gallery 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.gallery_categories(id) ON DELETE SET NULL;

-- Add image_key to strategic_objectives if it doesn't exist
ALTER TABLE public.strategic_objectives 
ADD COLUMN IF NOT EXISTS image_key TEXT;

-- Add image_key to past_work if it doesn't exist
ALTER TABLE public.past_work 
ADD COLUMN IF NOT EXISTS image_key TEXT;

-- Add image_key to upcoming_work if it doesn't exist
ALTER TABLE public.upcoming_work 
ADD COLUMN IF NOT EXISTS image_key TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gallery_category_id ON public.gallery(category_id);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_name ON public.gallery_categories(name);

-- Enable RLS
ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gallery_categories
DROP POLICY IF EXISTS "Public can read categories" ON public.gallery_categories;
CREATE POLICY "Public can read categories" ON public.gallery_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.gallery_categories;
CREATE POLICY "Admins manage categories" ON public.gallery_categories
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Update gallery RLS to include category
DROP POLICY IF EXISTS "Public can read gallery" ON public.gallery;
CREATE POLICY "Public can read gallery" ON public.gallery
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage gallery" ON public.gallery;
CREATE POLICY "Admins manage gallery" ON public.gallery
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

