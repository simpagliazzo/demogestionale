-- Create hotel registry table for reusable hotels
CREATE TABLE public.hotel_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.hotel_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view hotel registry" ON public.hotel_registry
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage hotel registry" ON public.hotel_registry
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admin can manage hotel registry" ON public.hotel_registry
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Agents can manage hotel registry" ON public.hotel_registry
  FOR ALL USING (has_role(auth.uid(), 'agente'::app_role));

-- Add email column to existing hotels table
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS email TEXT;