-- Tabella per gestire i token di upload documenti
CREATE TABLE public.upload_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Indice per ricerca veloce del token
CREATE INDEX idx_upload_tokens_token ON public.upload_tokens(token);

-- RLS abilitato
ALTER TABLE public.upload_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti autenticati possono creare/vedere i token
CREATE POLICY "Authenticated users can manage upload tokens"
ON public.upload_tokens
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'agente', 'super_admin')
  )
);

-- Policy: lettura pubblica per token validi (per la pagina di upload)
CREATE POLICY "Public can read valid tokens"
ON public.upload_tokens
FOR SELECT
USING (
  expires_at > now()
);

-- Permetti inserimento anonimo nei documenti partecipanti (per upload pubblico)
CREATE POLICY "Allow public upload to participant-docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'participant-docs'
);