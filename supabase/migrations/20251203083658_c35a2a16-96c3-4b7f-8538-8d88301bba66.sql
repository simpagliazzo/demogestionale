-- Aggiungi campo sconto al partecipante
ALTER TABLE public.participants 
ADD COLUMN discount_type text DEFAULT NULL,
ADD COLUMN discount_amount numeric DEFAULT 0;

-- Aggiungi tipo viaggio alla tabella trips
ALTER TABLE public.trips 
ADD COLUMN trip_type text NOT NULL DEFAULT 'standard';

-- Commento: trip_type può essere 'standard' (con pernottamento) o 'day_trip' (giornaliero)