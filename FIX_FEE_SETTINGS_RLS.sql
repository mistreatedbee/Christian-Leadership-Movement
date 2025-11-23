-- Fix RLS policies for fee_settings to allow admins to update fees
-- This ensures the admin policy uses the same function as other tables

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read fee_settings" ON public.fee_settings;
DROP POLICY IF EXISTS "Admins manage fee_settings" ON public.fee_settings;

-- Public can read fee settings (for application forms)
CREATE POLICY "Public can read fee_settings"
  ON public.fee_settings
  FOR SELECT
  USING (true);

-- Admins can manage fee settings (using the same admin check function)
CREATE POLICY "Admins manage fee_settings"
  ON public.fee_settings
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

