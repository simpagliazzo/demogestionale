-- Aggiungi colonna group_number per identificare chi viaggia insieme
ALTER TABLE public.participants ADD COLUMN group_number INTEGER DEFAULT NULL;

-- Crea un indice per velocizzare le query di raggruppamento
CREATE INDEX idx_participants_group_number ON public.participants(group_number);
CREATE INDEX idx_participants_trip_group ON public.participants(trip_id, group_number);