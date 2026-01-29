-- Tabella per storico pagamenti contratto
CREATE TABLE public.contract_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.agency_contract(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bonifico',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;

-- Policy: solo super_admin può gestire i pagamenti contratto
CREATE POLICY "Super admin can manage contract payments"
  ON public.contract_payments
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy: utenti autenticati possono vedere i pagamenti (per il banner)
CREATE POLICY "Authenticated can view contract payments"
  ON public.contract_payments
  FOR SELECT
  USING (auth.role() = 'authenticated'::text);