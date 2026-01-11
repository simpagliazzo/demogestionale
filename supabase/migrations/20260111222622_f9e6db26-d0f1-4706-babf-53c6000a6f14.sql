-- Add IBAN and SDI code fields to agency_settings
ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS sdi_code text;