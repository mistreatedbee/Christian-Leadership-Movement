-- Fix Row Level Security policies for payments table
-- Run this SQL script in your InsForge database console

-- Add INSERT policy for users to create their own payments
DROP POLICY IF EXISTS "Users create own payments" ON public.payments;
CREATE POLICY "Users create own payments" ON public.payments
  FOR INSERT 
  WITH CHECK (user_id = public.get_current_user_id());

-- Add UPDATE policy for users to update their own payments
DROP POLICY IF EXISTS "Users update own payments" ON public.payments;
CREATE POLICY "Users update own payments" ON public.payments
  FOR UPDATE 
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Note: The existing SELECT and admin policies should remain as they are

