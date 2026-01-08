
-- Tabella per i token di selezione posto bus
CREATE TABLE public.bus_seat_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indice per ricerca veloce per token
CREATE INDEX idx_bus_seat_tokens_token ON public.bus_seat_tokens(token);

-- Abilita RLS
ALTER TABLE public.bus_seat_tokens ENABLE ROW LEVEL SECURITY;

-- Policy per lettura pubblica dei token validi
CREATE POLICY "Public can read valid bus seat tokens"
ON public.bus_seat_tokens
FOR SELECT
USING (expires_at > now());

-- Policy per staff per gestire i token
CREATE POLICY "Staff can manage bus seat tokens"
ON public.bus_seat_tokens
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agente'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Policy per update pubblico (per marcare come usato)
CREATE POLICY "Public can update their token as used"
ON public.bus_seat_tokens
FOR UPDATE
USING (expires_at > now() AND used_at IS NULL)
WITH CHECK (expires_at > now());

-- Aggiungi policy per permettere inserimento posti bus da token valido
CREATE POLICY "Public can insert seat via valid token"
ON public.bus_seat_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bus_seat_tokens bst
    WHERE bst.participant_id = bus_seat_assignments.participant_id
    AND bst.expires_at > now()
    AND bst.used_at IS NULL
  )
);
