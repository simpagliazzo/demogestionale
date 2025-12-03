
-- Add ON DELETE CASCADE to bus_seat_assignments -> participants
ALTER TABLE public.bus_seat_assignments
DROP CONSTRAINT IF EXISTS bus_seat_assignments_participant_id_fkey;

ALTER TABLE public.bus_seat_assignments
ADD CONSTRAINT bus_seat_assignments_participant_id_fkey
FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;

-- Add created_by column to participants table to track who inserted them
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Add created_by column to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_created_by ON public.participants(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
