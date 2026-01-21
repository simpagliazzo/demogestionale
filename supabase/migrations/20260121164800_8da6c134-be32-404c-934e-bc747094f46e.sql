-- Aggiungi campo per tracciare chi ha effettivamente pagato (per pagamenti di gruppo)
ALTER TABLE public.payments 
ADD COLUMN paid_by_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL;

-- Commento per documentare lo scopo
COMMENT ON COLUMN public.payments.paid_by_participant_id IS 'ID del partecipante che ha fisicamente effettuato il pagamento (utile per bonifici di gruppo e rimborsi)';