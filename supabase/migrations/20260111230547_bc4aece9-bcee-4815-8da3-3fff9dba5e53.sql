-- Seed data per agency_settings (configurazione iniziale vuota per nuovi progetti)
INSERT INTO public.agency_settings (
  business_name,
  country,
  whatsapp_include_bus_seat,
  whatsapp_include_document_upload,
  whatsapp_include_confirmation_link,
  whatsapp_include_economic_details,
  og_quote_title,
  og_quote_description,
  og_confirmation_title,
  og_confirmation_description
)
SELECT 
  '',
  'Italia',
  true,
  true,
  true,
  true,
  'Preventivo di Viaggio - {DESTINAZIONE}',
  'Preventivo personalizzato per il tuo viaggio a {DESTINAZIONE}',
  'Conferma Prenotazione - {VIAGGIO}',
  'La tua prenotazione per {VIAGGIO} è confermata!'
WHERE NOT EXISTS (SELECT 1 FROM public.agency_settings LIMIT 1);