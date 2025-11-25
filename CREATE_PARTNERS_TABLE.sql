-- Create partners table for managing partner organizations
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  logo_key TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  partner_type TEXT, -- e.g., 'educational', 'government', 'ministry', 'church'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Create index for active partners
CREATE INDEX IF NOT EXISTS idx_partners_active ON public.partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_display_order ON public.partners(display_order);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all partners" ON public.partners;
DROP POLICY IF EXISTS "Users can view active partners" ON public.partners;
DROP POLICY IF EXISTS "Public can view active partners" ON public.partners;

-- Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all partners"
  ON public.partners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Public can view active partners (no authentication required)
CREATE POLICY "Public can view active partners"
  ON public.partners
  FOR SELECT
  USING (is_active = true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partners_updated_at();

-- Comments
COMMENT ON TABLE public.partners IS 'Stores partner organizations information including logos, descriptions, and contact details. All data is dynamically pulled from this table.';
COMMENT ON COLUMN public.partners.display_order IS 'Order in which partners should be displayed. Lower numbers appear first.';
COMMENT ON COLUMN public.partners.is_active IS 'Whether the partner should be displayed on the public site. Only active partners are shown.';

