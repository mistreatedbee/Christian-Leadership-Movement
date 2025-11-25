-- UPDATE APPLICATIONS TABLE FOR PAYMENT METHOD SUPPORT
-- This migration adds payment method tracking to applications

-- Add payment method column if it doesn't exist
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('manual', 'payfast', 'ozow', NULL));

-- Add payment gateway column if it doesn't exist
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) CHECK (payment_gateway IN ('payfast', 'ozow', NULL));

-- Add POP verification status column if it doesn't exist
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS pop_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (pop_verification_status IN ('pending', 'verified', 'rejected'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_payment_method ON public.applications(payment_method);
CREATE INDEX IF NOT EXISTS idx_applications_pop_verification ON public.applications(pop_verification_status);

-- Update existing applications to have default payment_method based on payment_proof_url
UPDATE public.applications
SET payment_method = 'manual'
WHERE payment_proof_url IS NOT NULL AND payment_method IS NULL;

-- Add comment
COMMENT ON COLUMN public.applications.payment_method IS 'Payment method: manual (with POP upload), payfast, or ozow';
COMMENT ON COLUMN public.applications.payment_gateway IS 'Payment gateway used if payment_method is online (payfast or ozow)';
COMMENT ON COLUMN public.applications.pop_verification_status IS 'Status of proof of payment verification: pending, verified, or rejected';

