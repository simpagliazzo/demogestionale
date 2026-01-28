-- Tabella per gestire il contratto agenzia
CREATE TABLE public.agency_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  contract_file_url text,
  annual_amount numeric DEFAULT 0,
  is_paid boolean DEFAULT false,
  payment_date date,
  block_after_date date,
  is_blocked boolean DEFAULT false,
  blocked_at timestamp with time zone,
  blocked_by uuid REFERENCES public.profiles(id),
  notes text,
  reminder_30_sent boolean DEFAULT false,
  reminder_15_sent boolean DEFAULT false,
  reminder_7_sent boolean DEFAULT false,
  client_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.agency_contract ENABLE ROW LEVEL SECURITY;

-- Solo super_admin può gestire i contratti
CREATE POLICY "Super admin can manage agency contract"
  ON public.agency_contract
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tutti gli autenticati possono leggere per vedere gli alert
CREATE POLICY "Authenticated can view contract status"
  ON public.agency_contract
  FOR SELECT
  USING (auth.role() = 'authenticated'::text);

-- Trigger per updated_at
CREATE TRIGGER update_agency_contract_updated_at
  BEFORE UPDATE ON public.agency_contract
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();