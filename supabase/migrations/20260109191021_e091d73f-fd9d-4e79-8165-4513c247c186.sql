-- Add separate note fields for hotel and companion
ALTER TABLE public.participants 
ADD COLUMN notes_hotel TEXT DEFAULT NULL,
ADD COLUMN notes_companion TEXT DEFAULT NULL;