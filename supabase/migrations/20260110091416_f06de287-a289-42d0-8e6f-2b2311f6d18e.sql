
-- Tabella per i dati dell'agenzia
CREATE TABLE public.agency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  country TEXT DEFAULT 'Italia',
  phone TEXT,
  email TEXT,
  website TEXT,
  vat_number TEXT,
  fiscal_code TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i template dei messaggi WhatsApp
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policies per agency_settings (solo utenti autenticati possono leggere/scrivere)
CREATE POLICY "Authenticated users can view agency settings" 
ON public.agency_settings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert agency settings" 
ON public.agency_settings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update agency settings" 
ON public.agency_settings 
FOR UPDATE 
TO authenticated
USING (true);

-- Policies per whatsapp_templates
CREATE POLICY "Authenticated users can view whatsapp templates" 
ON public.whatsapp_templates 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert whatsapp templates" 
ON public.whatsapp_templates 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update whatsapp templates" 
ON public.whatsapp_templates 
FOR UPDATE 
TO authenticated
USING (true);

-- Trigger per updated_at
CREATE TRIGGER update_agency_settings_updated_at
BEFORE UPDATE ON public.agency_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Inserisco i template di default
INSERT INTO public.whatsapp_templates (template_type, template_name, template_content, description) VALUES
('booking_confirmation', 'Conferma Prenotazione', 'Gentile {nome_partecipante},

La sua prenotazione per il viaggio "{titolo_viaggio}" è confermata!

📍 Destinazione: {destinazione}
📅 Partenza: {data_partenza}
📅 Rientro: {data_rientro}
🛏️ Sistemazione: {tipo_camera}

💰 Riepilogo economico:
- Totale: €{totale}
- Versato: €{versato}
- Saldo: €{saldo}

{link_documenti}
{link_posto_bus}

Cordiali saluti,
{nome_agenzia}
{telefono_agenzia}', 'Template per la conferma di prenotazione viaggio'),

('quote', 'Preventivo', 'Gentile {nome_cliente},

Ecco il preventivo richiesto per il viaggio a {destinazione}:

📅 Date: {data_partenza} - {data_rientro}
👥 Passeggeri: {num_passeggeri}

💰 Totale: €{totale}

Il preventivo è valido per 7 giorni.

Per confermare, contattaci!

{nome_agenzia}
{telefono_agenzia}
{email_agenzia}', 'Template per invio preventivo'),

('room_confirmation', 'Conferma Camera', 'Gentile Cliente,

Camera confermata per il viaggio "{titolo_viaggio}"!

🛏️ Tipo camera: {tipo_camera}
👥 Occupanti: {occupanti}

📅 Partenza: {data_partenza}
📅 Rientro: {data_rientro}

{nome_agenzia}
{telefono_agenzia}', 'Template per conferma assegnazione camera'),

('payment_reminder', 'Promemoria Pagamento', 'Gentile {nome_partecipante},

Le ricordiamo che per il viaggio "{titolo_viaggio}" risulta un saldo di €{saldo} da versare.

Per informazioni contattaci.

{nome_agenzia}
{telefono_agenzia}', 'Template per promemoria pagamento');

-- Inserisco i dati agenzia di default (vuoti)
INSERT INTO public.agency_settings (business_name) VALUES ('');
