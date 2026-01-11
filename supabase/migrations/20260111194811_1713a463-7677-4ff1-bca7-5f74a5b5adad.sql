-- Add WhatsApp message settings to agency_settings
ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS whatsapp_include_bus_seat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_include_document_upload boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_include_confirmation_link boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_include_economic_details boolean DEFAULT true;