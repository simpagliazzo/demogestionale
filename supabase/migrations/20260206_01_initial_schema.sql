-- ============================================================================
-- INITIAL SCHEMA - Tables core and storage
-- ============================================================================

-- CREATE AGENCY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.agency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  country TEXT DEFAULT 'Italia',
  phone TEXT,
  email TEXT,
  website TEXT,
  vat_number TEXT,
  fiscal_code TEXT,
  logo_url TEXT,
  travel_conditions TEXT,
  whatsapp_notification_phone TEXT,
  iban TEXT,
  sdi_code TEXT,
  whatsapp_include_bus_seat BOOLEAN DEFAULT true,
  whatsapp_include_document_upload BOOLEAN DEFAULT true,
  whatsapp_include_confirmation_link BOOLEAN DEFAULT true,
  whatsapp_include_economic_details BOOLEAN DEFAULT true,
  og_quote_title TEXT DEFAULT 'Preventivo di Viaggio - {DESTINAZIONE}',
  og_quote_description TEXT DEFAULT 'Preventivo personalizzato per il tuo viaggio a {DESTINAZIONE}',
  og_quote_image_url TEXT,
  og_confirmation_title TEXT DEFAULT 'Conferma Prenotazione - {VIAGGIO}',
  og_confirmation_description TEXT DEFAULT 'La tua prenotazione per {VIAGGIO} è confermata!',
  og_confirmation_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CREATE WHATSAPP TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AGENCY CONTRACT TABLE
CREATE TABLE IF NOT EXISTS public.agency_contract (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_file_url TEXT,
  annual_amount NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  payment_date DATE,
  block_after_date DATE,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  reminder_30_sent BOOLEAN DEFAULT false,
  reminder_15_sent BOOLEAN DEFAULT false,
  reminder_7_sent BOOLEAN DEFAULT false,
  client_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- CONTRACT PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.contract_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.agency_contract(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bonifico',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- HOTEL REGISTRY TABLE (reusable hotels)
CREATE TABLE IF NOT EXISTS public.hotel_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- BOOKING CONFIRMATION TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.booking_confirmation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BUS SEAT TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.bus_seat_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PARTICIPANTS UPDATES
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS notes_hotel TEXT DEFAULT NULL;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS notes_companion TEXT DEFAULT NULL;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS is_infant BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS has_restaurant BOOLEAN DEFAULT false;

-- QUOTES UPDATES
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS hotels JSONB DEFAULT '[]'::jsonb;

-- TRIPS UPDATES
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS flyer_url TEXT;

-- PAYMENTS UPDATES
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_by_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL;

-- HOTELS UPDATES
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS email TEXT;

-- BUS TYPES UPDATES
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS length_meters NUMERIC(4,1) DEFAULT 12.0;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS has_front_door BOOLEAN DEFAULT true;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS has_rear_door BOOLEAN DEFAULT true;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS has_driver_seat BOOLEAN DEFAULT true;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS has_guide_seat BOOLEAN DEFAULT true;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS has_wc BOOLEAN DEFAULT false;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS last_row_seats INTEGER DEFAULT 5;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'standard';
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS door_row_position INTEGER DEFAULT NULL;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS left_rows INTEGER;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS right_rows INTEGER;
ALTER TABLE public.bus_types ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- BUS CONFIGURATIONS UPDATES
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS length_meters NUMERIC(4,1);
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS has_front_door BOOLEAN DEFAULT true;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS has_rear_door BOOLEAN DEFAULT true;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS has_driver_seat BOOLEAN DEFAULT true;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS has_guide_seat BOOLEAN DEFAULT true;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS has_wc BOOLEAN DEFAULT false;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS last_row_seats INTEGER DEFAULT 5;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'standard';
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS door_row_position INTEGER DEFAULT NULL;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS left_rows INTEGER;
ALTER TABLE public.bus_configurations ADD COLUMN IF NOT EXISTS right_rows INTEGER;

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-assets', 'agency-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ENABLE RLS ON NEW TABLES
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_confirmation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_seat_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- COMMENTS
COMMENT ON COLUMN public.participants.notes_hotel IS 'Note hotel per il partecipante';
COMMENT ON COLUMN public.participants.notes_companion IS 'Note accompagnatore';
COMMENT ON COLUMN public.participants.is_infant IS 'Indica se il partecipante è un infant (non paga, dorme con i genitori)';
COMMENT ON COLUMN public.participants.has_restaurant IS 'Se il partecipante ha prenotato il ristorante';
COMMENT ON COLUMN public.quotes.hotels IS 'Array di opzioni hotel con singoli totali per preventivi comparativi';
COMMENT ON COLUMN public.payments.paid_by_participant_id IS 'ID del partecipante che ha fisicamente effettuato il pagamento';
COMMENT ON COLUMN public.agency_settings.og_quote_title IS 'Template per titolo anteprima preventivi. Placeholder: {DESTINAZIONE}, {NOME_CLIENTE}';
COMMENT ON COLUMN public.agency_settings.og_quote_description IS 'Template per descrizione anteprima preventivi';
COMMENT ON COLUMN public.agency_settings.og_confirmation_title IS 'Template per titolo anteprima conferme. Placeholder: {VIAGGIO}, {PARTECIPANTE}';
COMMENT ON COLUMN public.agency_settings.og_confirmation_description IS 'Template per descrizione anteprima conferme';
COMMENT ON COLUMN public.bus_configurations.door_row_position IS 'Numero della fila dove si trova la porta centrale (null = calcolato automaticamente)';
COMMENT ON COLUMN public.bus_types.door_row_position IS 'Numero della fila dove si trova la porta centrale per questo tipo di bus';
COMMENT ON COLUMN public.bus_configurations.left_rows IS 'Numero di file di posti sul lato sinistro (per configurazione avanzata manuale)';
COMMENT ON COLUMN public.bus_configurations.right_rows IS 'Numero di file di posti sul lato destro (per configurazione avanzata manuale, porta occupa spazio qui)';
