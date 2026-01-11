-- Add OG/preview customization fields to agency_settings
ALTER TABLE public.agency_settings
ADD COLUMN IF NOT EXISTS og_quote_title TEXT DEFAULT 'Preventivo di Viaggio - {DESTINAZIONE}',
ADD COLUMN IF NOT EXISTS og_quote_description TEXT DEFAULT 'Preventivo personalizzato per il tuo viaggio a {DESTINAZIONE}',
ADD COLUMN IF NOT EXISTS og_quote_image_url TEXT,
ADD COLUMN IF NOT EXISTS og_confirmation_title TEXT DEFAULT 'Conferma Prenotazione - {VIAGGIO}',
ADD COLUMN IF NOT EXISTS og_confirmation_description TEXT DEFAULT 'La tua prenotazione per {VIAGGIO} è confermata!',
ADD COLUMN IF NOT EXISTS og_confirmation_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.agency_settings.og_quote_title IS 'Template per titolo anteprima preventivi. Placeholder: {DESTINAZIONE}, {NOME_CLIENTE}';
COMMENT ON COLUMN public.agency_settings.og_quote_description IS 'Template per descrizione anteprima preventivi';
COMMENT ON COLUMN public.agency_settings.og_confirmation_title IS 'Template per titolo anteprima conferme. Placeholder: {VIAGGIO}, {PARTECIPANTE}';
COMMENT ON COLUMN public.agency_settings.og_confirmation_description IS 'Template per descrizione anteprima conferme';