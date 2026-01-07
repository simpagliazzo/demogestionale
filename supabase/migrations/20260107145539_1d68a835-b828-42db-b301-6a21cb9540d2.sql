-- Policy per permettere lettura pubblica dei partecipanti tramite token valido
CREATE POLICY "Public can read participant via valid token"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.upload_tokens ut
    WHERE ut.participant_id = participants.id
    AND ut.expires_at > now()
  )
);

-- Policy per permettere lettura pubblica dei viaggi tramite token valido
CREATE POLICY "Public can read trip via valid token"
ON public.trips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants p
    JOIN public.upload_tokens ut ON ut.participant_id = p.id
    WHERE p.trip_id = trips.id
    AND ut.expires_at > now()
  )
);