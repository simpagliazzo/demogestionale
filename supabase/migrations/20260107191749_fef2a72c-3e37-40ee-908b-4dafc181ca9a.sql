-- Create table for trip companions (multiple per trip)
CREATE TABLE public.trip_companions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, guide_id)
);

-- Enable RLS
ALTER TABLE public.trip_companions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage trip companions"
  ON public.trip_companions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage trip companions"
  ON public.trip_companions
  FOR ALL
  USING (has_role(auth.uid(), 'agente'::app_role));

CREATE POLICY "Super admin can manage trip companions"
  ON public.trip_companions
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can view trip companions"
  ON public.trip_companions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'agente'::app_role) OR 
    has_role(auth.uid(), 'accompagnatore'::app_role)
  );