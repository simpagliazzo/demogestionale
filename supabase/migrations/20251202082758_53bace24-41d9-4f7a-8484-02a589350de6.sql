-- Aggiungi il tipo di acconto (fisso o percentuale)
CREATE TYPE public.deposit_type AS ENUM ('fixed', 'percentage');

ALTER TABLE public.trips 
ADD COLUMN deposit_type public.deposit_type NOT NULL DEFAULT 'fixed';