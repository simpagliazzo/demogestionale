-- Create blacklist table for participants
CREATE TABLE public.blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  reason TEXT,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

-- Only admins can view blacklist
CREATE POLICY "Admins can view blacklist" 
ON public.blacklist 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage blacklist
CREATE POLICY "Admins can manage blacklist" 
ON public.blacklist 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));