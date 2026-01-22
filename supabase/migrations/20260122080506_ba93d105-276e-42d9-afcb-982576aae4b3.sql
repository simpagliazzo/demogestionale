-- Aggiungi colonna per la posizione della porta centrale (numero fila)
ALTER TABLE public.bus_configurations 
ADD COLUMN IF NOT EXISTS door_row_position integer DEFAULT NULL;

-- Aggiungi anche alla tabella bus_types per i preset
ALTER TABLE public.bus_types 
ADD COLUMN IF NOT EXISTS door_row_position integer DEFAULT NULL;

COMMENT ON COLUMN public.bus_configurations.door_row_position IS 'Numero della fila dove si trova la porta centrale (null = calcolato automaticamente)';
COMMENT ON COLUMN public.bus_types.door_row_position IS 'Numero della fila dove si trova la porta centrale per questo tipo di bus';