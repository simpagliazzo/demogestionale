-- Aggiungi nuovi campi alla tabella bus_types per configurazione avanzata
-- IMPORTANTE: Questi sono campi aggiuntivi, non sostituiscono quelli esistenti

-- Aggiungi colonne per configurazione avanzata bus
ALTER TABLE public.bus_types 
ADD COLUMN IF NOT EXISTS length_meters numeric(4,1) DEFAULT 12.0,
ADD COLUMN IF NOT EXISTS has_front_door boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_rear_door boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_driver_seat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_guide_seat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_wc boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_row_seats integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS layout_type text DEFAULT 'standard';

-- Aggiungi stessi campi a bus_configurations per permettere override per singolo viaggio
ALTER TABLE public.bus_configurations
ADD COLUMN IF NOT EXISTS length_meters numeric(4,1),
ADD COLUMN IF NOT EXISTS has_front_door boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_rear_door boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_driver_seat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_guide_seat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_wc boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_row_seats integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS layout_type text DEFAULT 'standard';

-- Aggiorna i tipi bus esistenti con configurazioni realistiche
UPDATE public.bus_types 
SET 
  length_meters = 12.0,
  has_front_door = true,
  has_rear_door = true,
  has_driver_seat = true,
  has_guide_seat = true,
  has_wc = false,
  last_row_seats = 5,
  layout_type = 'gt_standard'
WHERE name LIKE '%Standard%' OR name LIKE '%52%';

UPDATE public.bus_types 
SET 
  length_meters = 13.5,
  has_front_door = true,
  has_rear_door = true,
  has_driver_seat = true,
  has_guide_seat = true,
  has_wc = true,
  last_row_seats = 5,
  layout_type = 'gt_large'
WHERE name LIKE '%Large%' OR name LIKE '%65%' OR name LIKE '%64%';

UPDATE public.bus_types 
SET 
  length_meters = 8.0,
  has_front_door = true,
  has_rear_door = false,
  has_driver_seat = true,
  has_guide_seat = true,
  has_wc = false,
  last_row_seats = 4,
  layout_type = 'minibus'
WHERE name LIKE '%Mini%' OR name LIKE '%28%';

-- Commento: I posti già assegnati in bus_seat_assignments NON vengono modificati
-- La visualizzazione si adatterà alla nuova configurazione