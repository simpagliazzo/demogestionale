-- Aggiungi colonna per la modalità di pagamento
ALTER TABLE public.payments 
ADD COLUMN payment_method text DEFAULT 'contanti';

-- Commento per documentazione
COMMENT ON COLUMN public.payments.payment_method IS 'Modalità di pagamento: contanti, carta, bonifico, assegno';