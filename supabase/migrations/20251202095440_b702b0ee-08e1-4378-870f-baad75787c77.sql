-- Aggiungi campi per allotment camere, vettore e accompagnatore nella tabella trips
ALTER TABLE trips 
ADD COLUMN allotment_singole integer DEFAULT 0,
ADD COLUMN allotment_doppie integer DEFAULT 0,
ADD COLUMN allotment_matrimoniali integer DEFAULT 0,
ADD COLUMN allotment_triple integer DEFAULT 0,
ADD COLUMN allotment_quadruple integer DEFAULT 0,
ADD COLUMN carrier_id uuid REFERENCES bus_carriers(id) ON DELETE SET NULL,
ADD COLUMN companion_name text;

-- Aggiungi indice per migliorare le performance delle query
CREATE INDEX idx_trips_carrier_id ON trips(carrier_id);