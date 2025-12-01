-- Crea enum per i ruoli
CREATE TYPE public.app_role AS ENUM ('admin', 'agente', 'accompagnatore', 'cliente');

-- Crea enum per lo stato dei pagamenti
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'partial');

-- Crea enum per lo stato dei viaggi
CREATE TYPE public.trip_status AS ENUM ('planned', 'confirmed', 'ongoing', 'completed', 'cancelled');

-- Tabella profili utente
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  place_of_birth TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella ruoli utente
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Funzione per verificare ruoli (security definer per evitare ricorsione RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tabella viaggi
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  max_participants INTEGER,
  status trip_status DEFAULT 'planned' NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella partecipanti
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  place_of_birth TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella pagamenti
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'balance')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella hotel
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella camere
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella assegnazioni camere
CREATE TABLE public.room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (participant_id, room_id)
);

-- Tabella vettori bus
CREATE TABLE public.bus_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella configurazione posti bus
CREATE TABLE public.bus_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  carrier_id UUID REFERENCES public.bus_carriers(id),
  total_seats INTEGER NOT NULL,
  rows INTEGER NOT NULL,
  seats_per_row INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabella assegnazioni posti bus
CREATE TABLE public.bus_seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_config_id UUID REFERENCES public.bus_configurations(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  seat_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (bus_config_id, seat_number),
  UNIQUE (bus_config_id, participant_id)
);

-- Abilita RLS su tutte le tabelle
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_seat_assignments ENABLE ROW LEVEL SECURITY;

-- Policy per profiles: utenti vedono il proprio profilo, admin vede tutto
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policy per user_roles: solo admin può gestire ruoli
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Policy per trips: admin e agenti possono gestire, tutti gli autenticati possono vedere
CREATE POLICY "Authenticated can view trips" ON public.trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage trips" ON public.trips FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can manage trips" ON public.trips FOR ALL USING (public.has_role(auth.uid(), 'agente'));

-- Policy per participants: admin, agenti e accompagnatori possono vedere/gestire
CREATE POLICY "Staff can view participants" ON public.participants FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente') OR public.has_role(auth.uid(), 'accompagnatore'));
CREATE POLICY "Admin can manage participants" ON public.participants FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can manage participants" ON public.participants FOR ALL USING (public.has_role(auth.uid(), 'agente'));

-- Policy per payments: solo admin e agenti
CREATE POLICY "Staff can view payments" ON public.payments FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));
CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));

-- Policy per hotels: staff può vedere e gestire
CREATE POLICY "Staff can view hotels" ON public.hotels FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente') OR public.has_role(auth.uid(), 'accompagnatore'));
CREATE POLICY "Staff can manage hotels" ON public.hotels FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));

-- Policy per rooms: staff può vedere e gestire
CREATE POLICY "Staff can view rooms" ON public.rooms FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente') OR public.has_role(auth.uid(), 'accompagnatore'));
CREATE POLICY "Staff can manage rooms" ON public.rooms FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));

-- Policy per room_assignments: staff può vedere e gestire
CREATE POLICY "Staff can view room assignments" ON public.room_assignments FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente') OR public.has_role(auth.uid(), 'accompagnatore'));
CREATE POLICY "Staff can manage room assignments" ON public.room_assignments FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));

-- Policy per bus_carriers: tutti possono vedere, solo admin può gestire
CREATE POLICY "Staff can view carriers" ON public.bus_carriers FOR SELECT 
  USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage carriers" ON public.bus_carriers FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy per bus_configurations: staff può vedere e gestire
CREATE POLICY "Staff can view bus config" ON public.bus_configurations FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente') OR public.has_role(auth.uid(), 'accompagnatore'));
CREATE POLICY "Staff can manage bus config" ON public.bus_configurations FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));

-- Policy per bus_seat_assignments: staff può vedere e gestire
CREATE POLICY "Staff can view seat assignments" ON public.bus_seat_assignments FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente') OR public.has_role(auth.uid(), 'accompagnatore'));
CREATE POLICY "Staff can manage seat assignments" ON public.bus_seat_assignments FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agente'));

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_trips BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger per creare profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nuovo Utente'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();