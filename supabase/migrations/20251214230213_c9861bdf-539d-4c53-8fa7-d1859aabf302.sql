-- Create enum for permission types
CREATE TYPE public.permission_type AS ENUM (
  'manage_trips',
  'delete_trips',
  'manage_participants',
  'manage_payments',
  'manage_bus',
  'manage_carriers',
  'view_prices',
  'manage_hotels',
  'view_activity_logs'
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission permission_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view permissions (needed to check their own)
CREATE POLICY "Authenticated can view permissions"
ON public.role_permissions
FOR SELECT
USING (auth.role() = 'authenticated'::text);

-- Insert default permissions for admin (all permissions)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'manage_trips'),
  ('admin', 'delete_trips'),
  ('admin', 'manage_participants'),
  ('admin', 'manage_payments'),
  ('admin', 'manage_bus'),
  ('admin', 'manage_carriers'),
  ('admin', 'view_prices'),
  ('admin', 'manage_hotels'),
  ('admin', 'view_activity_logs');

-- Insert default permissions for agente
INSERT INTO public.role_permissions (role, permission) VALUES
  ('agente', 'manage_trips'),
  ('agente', 'manage_participants'),
  ('agente', 'manage_payments'),
  ('agente', 'manage_bus'),
  ('agente', 'manage_carriers'),
  ('agente', 'view_prices'),
  ('agente', 'manage_hotels');

-- Insert default permissions for accompagnatore (only view, no prices)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('accompagnatore', 'manage_bus');

-- Create function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id 
      AND rp.permission = _permission
  )
$$;

-- Make trip_id nullable in participants to allow orphaned participants
ALTER TABLE public.participants 
ALTER COLUMN trip_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete
ALTER TABLE public.participants
DROP CONSTRAINT participants_trip_id_fkey;

ALTER TABLE public.participants
ADD CONSTRAINT participants_trip_id_fkey 
FOREIGN KEY (trip_id) 
REFERENCES public.trips(id) 
ON DELETE SET NULL;