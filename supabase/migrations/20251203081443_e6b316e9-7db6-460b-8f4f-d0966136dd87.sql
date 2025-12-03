-- Add single room supplement field to trips table
ALTER TABLE public.trips 
ADD COLUMN single_room_supplement numeric DEFAULT 0;