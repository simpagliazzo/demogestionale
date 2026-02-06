-- ============================================================================
-- SEED DATA - Default templates and agency settings
-- ============================================================================

-- INSERT WHATSAPP TEMPLATES (if not existing)
INSERT INTO public.whatsapp_templates (template_type, template_name, template_content, description)
VALUES 
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
{link_conferma}

Cordiali saluti,
{nome_agenzia}
{telefono_agenzia}', 'Template per la conferma di prenotazione viaggio'),

  ('payment_reminder', 'Promemoria Pagamento', 'Gentile {nome_partecipante},

Le ricordiamo che per il viaggio "{titolo_viaggio}" risulta un saldo di €{saldo} da versare.

Per informazioni contattaci.

{nome_agenzia}
{telefono_agenzia}', 'Template per promemoria pagamento'),

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
{telefono_agenzia}', 'Template per conferma assegnazione camera')

ON CONFLICT (template_type) DO NOTHING;

-- INSERT DEFAULT AGENCY SETTINGS (if not existing)
-- Delete old empty seed first
DELETE FROM public.agency_settings WHERE business_name = '' AND legal_name IS NULL;

-- Insert Gladiatour complete data (if not existing)
INSERT INTO public.agency_settings (
  business_name,
  legal_name,
  address,
  city,
  postal_code,
  province,
  country,
  phone,
  email,
  website,
  whatsapp_include_bus_seat,
  whatsapp_include_document_upload,
  whatsapp_include_confirmation_link,
  whatsapp_include_economic_details,
  og_quote_title,
  og_quote_description,
  og_confirmation_title,
  og_confirmation_description,
  travel_conditions
)
SELECT 
  'Gestionali Viaggi',
  'Gestionali Viaggi',
  'Via Fonte Peschiera 02',
  'Torrice',
  '03020',
  'FR',
  'Italia',
  '+393207532262',
  'viaggi.gladiatours@gmail.com',
  'www.gladiatour.it',
  true,
  true,
  true,
  true,
  'Preventivo di Viaggio - {DESTINAZIONE}',
  'Preventivo personalizzato per il tuo viaggio a {DESTINAZIONE}',
  'Conferma Prenotazione - {VIAGGIO}',
  'La tua prenotazione per {VIAGGIO} è confermata!',
  'CANCELLAZIONI E PENALI
In caso di rinuncia da parte del cliente, saranno applicate penali calcolate in base alla data dell''annullamento:

Gite con pernottamento

Dal 30° al 15° giorno prima della partenza: penale pari al 50% della quota.

Dal 14° all''8° giorno prima della partenza: penale pari al 75% della quota.

Negli ultimi 7 giorni prima della partenza: penale pari al 100% della quota.

La penale è calcolata sulla quota totale del pacchetto.

Gite in giornata (1 giorno)

Fino a 10 giorni prima della partenza: penale del 50% del totale.

Negli ultimi 7 giorni: nessun rimborso.

Nota: le percentuali si applicano sull''importo totale del pacchetto acquistato.

Nei viaggi che includono voli o strutture non rimborsabili, saranno trattenuti anche i costi dei biglietti aerei e degli hotel già acquistati. La Direzione si riserva la possibilità di valutare eventuali eccezioni.

Eventuali spese causate da ritardi, scioperi, eventi atmosferici, imprevisti tecnici o calamità naturali non saranno rimborsabili.'
WHERE NOT EXISTS (SELECT 1 FROM public.agency_settings LIMIT 1);

-- UPDATE BUS TYPES WITH REALISTIC CONFIGURATIONS
UPDATE public.bus_types 
SET 
  length_meters = 12.0,
  has_front_door = true,
  has_rear_door = true,
  has_driver_seat = true,
  has_guide_seat = true,
  has_wc = false,
  last_row_seats = 5,
  layout_type = 'gt_standard'
WHERE name LIKE '%Standard%' OR name LIKE '%52%';

UPDATE public.bus_types 
SET 
  length_meters = 13.5,
  has_front_door = true,
  has_rear_door = true,
  has_driver_seat = true,
  has_guide_seat = true,
  has_wc = true,
  last_row_seats = 5,
  layout_type = 'gt_large'
WHERE name LIKE '%Large%' OR name LIKE '%65%' OR name LIKE '%64%';

UPDATE public.bus_types 
SET 
  length_meters = 8.0,
  has_front_door = true,
  has_rear_door = false,
  has_driver_seat = true,
  has_guide_seat = true,
  has_wc = false,
  last_row_seats = 4,
  layout_type = 'minibus'
WHERE name LIKE '%Mini%' OR name LIKE '%28%';
