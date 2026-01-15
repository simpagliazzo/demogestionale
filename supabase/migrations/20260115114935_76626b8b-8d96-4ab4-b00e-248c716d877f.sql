-- Aggiungi campo is_infant alla tabella participants
ALTER TABLE public.participants 
ADD COLUMN is_infant boolean NOT NULL DEFAULT false;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.participants.is_infant IS 'Indica se il partecipante è un infant (non paga, dorme con i genitori)';