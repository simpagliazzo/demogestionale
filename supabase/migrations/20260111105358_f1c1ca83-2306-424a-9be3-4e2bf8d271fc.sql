-- Add hotels array column to support multiple hotel options in quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS hotels JSONB DEFAULT '[]'::jsonb;

-- The hotels column will store an array of hotel options, each with:
-- name, address, room_type, check_in, check_out, price_per_night, nights, total
-- Example: [{"name": "Hotel Praga Centro", "price_per_night": 100, "nights": 2, "total": 200}, {"name": "Hotel Astor", "price_per_night": 75, "nights": 2, "total": 150}]

COMMENT ON COLUMN public.quotes.hotels IS 'Array of hotel options with individual totals for comparison quotes';