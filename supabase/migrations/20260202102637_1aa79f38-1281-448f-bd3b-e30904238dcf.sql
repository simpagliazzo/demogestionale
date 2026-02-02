-- Create restaurants table for trips (similar to hotels)
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage restaurants"
ON public.restaurants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agente'::app_role));

CREATE POLICY "Staff can view restaurants"
ON public.restaurants
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agente'::app_role) OR has_role(auth.uid(), 'accompagnatore'::app_role));

CREATE POLICY "Super admin can manage restaurants"
ON public.restaurants
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add has_restaurant column to participants
ALTER TABLE public.participants
ADD COLUMN has_restaurant BOOLEAN DEFAULT false;