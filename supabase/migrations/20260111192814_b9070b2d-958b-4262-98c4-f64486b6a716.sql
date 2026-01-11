-- Aggiungi campo condizioni di viaggio in agency_settings
ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS travel_conditions TEXT;

-- Aggiungi telefono WhatsApp per notifiche (dove ricevere conferme)
ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS whatsapp_notification_phone TEXT;

-- Tabella per token conferma prenotazione
CREATE TABLE public.booking_confirmation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.booking_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: pubblico può leggere token validi
CREATE POLICY "Public can read valid booking confirmation tokens"
ON public.booking_confirmation_tokens
FOR SELECT
USING (expires_at > now());

-- Policy: pubblico può aggiornare per confermare
CREATE POLICY "Public can confirm booking"
ON public.booking_confirmation_tokens
FOR UPDATE
USING (expires_at > now() AND confirmed_at IS NULL)
WITH CHECK (expires_at > now());

-- Policy: staff può gestire token
CREATE POLICY "Staff can manage booking confirmation tokens"
ON public.booking_confirmation_tokens
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agente'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Policy: pubblico può leggere partecipante tramite token conferma
CREATE POLICY "Public can read participant via confirmation token"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_confirmation_tokens bct
    WHERE bct.participant_id = participants.id
    AND bct.expires_at > now()
  )
);

-- Policy: pubblico può leggere viaggio tramite token conferma
CREATE POLICY "Public can read trip via confirmation token"
ON public.trips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_confirmation_tokens bct
    WHERE bct.trip_id = trips.id
    AND bct.expires_at > now()
  )
);

-- Policy: pubblico può leggere agency_settings (per condizioni)
CREATE POLICY "Public can read agency settings"
ON public.agency_settings
FOR SELECT
USING (true);