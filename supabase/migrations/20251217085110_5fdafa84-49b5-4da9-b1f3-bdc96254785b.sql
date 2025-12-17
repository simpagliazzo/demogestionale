-- Create quotes table for individual travel quotes
CREATE TABLE public.quotes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    
    -- Customer info
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Trip info
    destination TEXT NOT NULL,
    departure_date DATE,
    return_date DATE,
    num_passengers INTEGER DEFAULT 1,
    
    -- Flight details (stored as JSONB for flexibility)
    flights JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"type": "andata", "airline": "Ryanair", "departure_time": "08:00", "arrival_time": "10:30", "price": 150}]
    
    -- Hotel details
    hotel_name TEXT,
    hotel_address TEXT,
    hotel_room_type TEXT,
    hotel_check_in DATE,
    hotel_check_out DATE,
    hotel_price_per_night NUMERIC DEFAULT 0,
    hotel_nights INTEGER DEFAULT 0,
    hotel_total NUMERIC DEFAULT 0,
    
    -- Transfer details (stored as JSONB for flexibility)
    transfers JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"type": "Aeroporto-Hotel", "price": 50}]
    
    -- Other items (escursioni, assicurazione, etc.)
    other_items JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"description": "Escursione centro storico", "price": 80}]
    
    -- Pricing
    subtotal NUMERIC DEFAULT 0,
    markup_percentage NUMERIC DEFAULT 0,
    markup_amount NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    
    -- Notes
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Admin and agents can manage quotes
CREATE POLICY "Admin can manage quotes" 
ON public.quotes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can manage quotes" 
ON public.quotes 
FOR ALL 
USING (has_role(auth.uid(), 'agente'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();