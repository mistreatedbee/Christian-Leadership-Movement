-- =====================================================
-- ADD MISSING COLUMNS TO EXISTING RESOURCES TABLE
-- =====================================================
-- Run this ONLY if the resources table already exists
-- but is missing some columns

-- Add missing columns to resources table
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_key TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_resources_category_id ON public.resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_is_featured ON public.resources(is_featured);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON public.resources(is_public);
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at);

