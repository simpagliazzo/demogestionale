-- Tabella per accompagnatori e guide
CREATE TABLE public.guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'accompagnatore', -- 'accompagnatore' o 'guida'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Abilita RLS
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

-- Policy per admin
CREATE POLICY "Admin can manage guides"
ON public.guides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy per super admin
CREATE POLICY "Super admin can manage guides"
ON public.guides
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per agenti
CREATE POLICY "Agents can manage guides"
ON public.guides
FOR ALL
USING (has_role(auth.uid(), 'agente'::app_role));

-- Policy per accompagnatori (solo lettura)
CREATE POLICY "Accompagnatori can view guides"
ON public.guides
FOR SELECT
USING (has_role(auth.uid(), 'accompagnatore'::app_role));

-- Aggiungi colonna guide_name alla tabella trips
ALTER TABLE public.trips ADD COLUMN guide_name TEXT;