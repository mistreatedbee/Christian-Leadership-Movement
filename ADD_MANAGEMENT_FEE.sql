-- Add Management Fee to fee_settings table
-- This allows admins to set and manage the management fee

-- Insert management fee if it doesn't exist
INSERT INTO public.fee_settings (fee_type, amount, currency, description, is_active)
VALUES ('management_fee', 0.00, 'ZAR', 'Management fee for administrative services', true)
ON CONFLICT (fee_type) DO NOTHING;

-- If the fee already exists, you can update it with:
-- UPDATE public.fee_settings 
-- SET amount = 100.00, description = 'Management fee for administrative services', is_active = true
-- WHERE fee_type = 'management_fee';

