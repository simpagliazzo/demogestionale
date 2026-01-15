-- Add flyer_url column to trips table for storing the link to the trip's promotional flyer
ALTER TABLE public.trips ADD COLUMN flyer_url TEXT;