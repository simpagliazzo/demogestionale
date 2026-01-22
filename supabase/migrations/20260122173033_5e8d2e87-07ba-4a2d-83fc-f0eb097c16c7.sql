-- Add columns to bus_types for custom/manual configurations
ALTER TABLE bus_types 
ADD COLUMN IF NOT EXISTS left_rows INTEGER,
ADD COLUMN IF NOT EXISTS right_rows INTEGER,
ADD COLUMN IF NOT EXISTS door_row_position INTEGER,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;