-- Crea tabella per i tipi di bus configurabili
CREATE TABLE IF NOT EXISTS public.bus_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL,
  seats_per_row INTEGER NOT NULL,
  total_seats INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Aggiungi RLS
ALTER TABLE public.bus_types ENABLE ROW LEVEL SECURITY;

-- Policy per visualizzare i tipi di bus (tutti gli autenticati)
CREATE POLICY "Staff can view bus types" 
ON public.bus_types 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy per gestire i tipi di bus (solo admin)
CREATE POLICY "Admin can manage bus types" 
ON public.bus_types 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Aggiungi colonna bus_type_id a bus_configurations
ALTER TABLE public.bus_configurations 
ADD COLUMN IF NOT EXISTS bus_type_id UUID REFERENCES public.bus_types(id);

-- Inserisci configurazioni standard
INSERT INTO public.bus_types (name, rows, seats_per_row, total_seats, description) VALUES
('GT Standard (52 posti)', 13, 4, 52, 'Bus Gran Turismo standard con 13 file da 4 posti'),
('GT Large (65 posti)', 16, 4, 64, 'Bus Gran Turismo grande con 16 file da 4 posti + 1 posto singolo'),
('Minibus (28 posti)', 7, 4, 28, 'Minibus con 7 file da 4 posti')
ON CONFLICT DO NOTHING;