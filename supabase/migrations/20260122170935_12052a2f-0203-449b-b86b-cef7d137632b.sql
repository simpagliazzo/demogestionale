-- Add columns for advanced bus layout configuration
ALTER TABLE public.bus_configurations
ADD COLUMN IF NOT EXISTS left_rows integer,
ADD COLUMN IF NOT EXISTS right_rows integer;

-- Add comment for documentation
COMMENT ON COLUMN public.bus_configurations.left_rows IS 'Number of seat rows on the left side (for manual advanced configuration)';
COMMENT ON COLUMN public.bus_configurations.right_rows IS 'Number of seat rows on the right side (for manual advanced configuration, door occupies space here)';