-- ============================================================================
-- CREATE BASE TABLES - Core tables needed for the application
-- ============================================================================

-- ENUM TYPES
CREATE TYPE trip_status AS ENUM ('planned', 'confirmed', 'ongoing', 'completed', 'cancelled');
CREATE TYPE deposit_type AS ENUM ('fixed', 'percentage');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'partial');
CREATE TYPE app_role AS ENUM ('admin', 'agente', 'accompagnatore', 'cliente', 'super_admin');
CREATE TYPE permission_type AS ENUM ('manage_trips', 'delete_trips', 'manage_participants', 'manage_payments', 'manage_bus', 'manage_carriers', 'view_prices', 'manage_hotels', 'view_activity_logs');

-- TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL,
  deposit_type deposit_type DEFAULT 'fixed',
  status trip_status DEFAULT 'planned',
  max_participants INTEGER,
  guide_name TEXT,
  companion_name TEXT,
  carrier_id UUID,
  trip_type TEXT,
  allotment_singole INTEGER,
  allotment_doppie INTEGER,
  allotment_triple INTEGER,
  allotment_matrimoniali INTEGER,
  allotment_quadruple INTEGER,
  single_room_supplement NUMERIC,
  flyer_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  group_number INTEGER,
  room_assignment TEXT,
  notes TEXT,
  notes_hotel TEXT,
  notes_companion TEXT,
  is_infant BOOLEAN NOT NULL DEFAULT false,
  has_restaurant BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  status payment_status DEFAULT 'pending',
  notes TEXT,
  paid_by_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QUOTES TABLE
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  num_participants INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'draft',
  hotels JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- HOTELS TABLE
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ROOM ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.room_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BUS TYPES TABLE
CREATE TABLE IF NOT EXISTS public.bus_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rows INTEGER,
  seats_per_row INTEGER,
  total_seats INTEGER,
  has_driver_seat BOOLEAN DEFAULT true,
  has_guide_seat BOOLEAN DEFAULT true,
  has_front_door BOOLEAN DEFAULT true,
  has_rear_door BOOLEAN DEFAULT true,
  has_wc BOOLEAN DEFAULT false,
  length_meters NUMERIC(4,1) DEFAULT 12.0,
  last_row_seats INTEGER DEFAULT 5,
  layout_type TEXT DEFAULT 'standard',
  door_row_position INTEGER,
  left_rows INTEGER,
  right_rows INTEGER,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BUS CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.bus_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  bus_type_id UUID REFERENCES public.bus_types(id),
  total_seats INTEGER,
  length_meters NUMERIC(4,1),
  has_front_door BOOLEAN DEFAULT true,
  has_rear_door BOOLEAN DEFAULT true,
  has_driver_seat BOOLEAN DEFAULT true,
  has_guide_seat BOOLEAN DEFAULT true,
  has_wc BOOLEAN DEFAULT false,
  last_row_seats INTEGER DEFAULT 5,
  layout_type TEXT DEFAULT 'standard',
  door_row_position INTEGER,
  left_rows INTEGER,
  right_rows INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BUS SEAT ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.bus_seat_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_config_id UUID NOT NULL REFERENCES public.bus_configurations(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  action_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- ROLE PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission permission_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

-- UPLOAD TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.upload_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TRIP GUIDES TABLE
CREATE TABLE IF NOT EXISTS public.trip_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ENABLE RLS ON BASE TABLES
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_guides ENABLE ROW LEVEL SECURITY;

-- CREATE FUNCTION: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- CREATE FUNCTION: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- CREATE FUNCTION: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission permission_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission
  );
END;
$$;

-- CREATE TRIGGER: handle_updated_at for trips
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- CREATE TRIGGER: handle_updated_at for participants
CREATE TRIGGER update_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- CREATE TRIGGER: handle_updated_at for payments
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- CREATE TRIGGER: handle_updated_at for quotes
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
