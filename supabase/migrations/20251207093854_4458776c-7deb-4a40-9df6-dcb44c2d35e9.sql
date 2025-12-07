-- Crea tabella per i log delle attività
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete'
  entity_type TEXT, -- 'trip', 'participant', 'payment', 'room', 'bus_seat', etc.
  entity_id UUID,
  entity_name TEXT, -- Nome leggibile dell'entità (es. nome viaggio, nome partecipante)
  details JSONB, -- Dettagli aggiuntivi
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Solo admin possono visualizzare i log
CREATE POLICY "Admin can view all logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff può inserire log (per tracciare le proprie azioni)
CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Indici per performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);