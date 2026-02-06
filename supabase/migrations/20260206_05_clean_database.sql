-- ============================================================================
-- CLEAN DATABASE - Remove all data while keeping structure
-- ============================================================================

-- Disabilitare temporaneamente i trigger su participants
ALTER TABLE public.participants DISABLE TRIGGER IF EXISTS trigger_auto_confirm_trip;

-- Eliminare i dati in ordine corretto per rispettare le foreign keys
-- Start with tables that have no dependents
DELETE FROM public.bus_seat_assignments;
DELETE FROM public.bus_seat_tokens;
DELETE FROM public.booking_confirmation_tokens;
DELETE FROM public.bus_configurations;
DELETE FROM public.restaurants;
DELETE FROM public.contract_payments;
DELETE FROM public.payments;
DELETE FROM public.participants;
DELETE FROM public.quotes;
DELETE FROM public.hotels;
DELETE FROM public.trips;
DELETE FROM public.agency_contract;
DELETE FROM public.hotel_registry;

-- Delete seed templates and agency settings last
TRUNCATE TABLE public.whatsapp_templates CASCADE;
TRUNCATE TABLE public.agency_settings CASCADE;
TRUNCATE TABLE public.bus_types CASCADE;

-- Riabilitare i trigger
ALTER TABLE public.participants ENABLE TRIGGER IF EXISTS trigger_auto_confirm_trip;

-- Reinserire il template vuoto di agenzia
INSERT INTO public.agency_settings (business_name, country) 
VALUES ('', 'Italia')
ON CONFLICT DO NOTHING;

-- Reinserire i template WhatsApp base
INSERT INTO public.whatsapp_templates (template_type, template_name, template_content, description)
VALUES 
  ('booking_confirmation', 'Conferma Prenotazione', 'Gentile {nome_partecipante},\n\nLa sua prenotazione per il viaggio "{titolo_viaggio}" è confermata!\n\n📍 Destinazione: {destinazione}\n📅 Partenza: {data_partenza}\n📅 Rientro: {data_rientro}\n🛏️ Sistemazione: {tipo_camera}\n\n💰 Riepilogo economico:\n- Totale: €{totale}\n- Versato: €{versato}\n- Saldo: €{saldo}\n\nCordiali saluti,\n{nome_agenzia}\n{telefono_agenzia}', 'Template per la conferma di prenotazione viaggio'),
  ('payment_reminder', 'Promemoria Pagamento', 'Gentile {nome_partecipante},\n\nLe ricordiamo che per il viaggio "{titolo_viaggio}" risulta un saldo di €{saldo} da versare.\n\nPer informazioni contattaci.\n\n{nome_agenzia}\n{telefono_agenzia}', 'Template per promemoria pagamento'),
  ('quote', 'Preventivo', 'Gentile {nome_cliente},\n\nEcco il preventivo richiesto per il viaggio a {destinazione}:\n\n📅 Date: {data_partenza} - {data_rientro}\n👥 Passeggeri: {num_passeggeri}\n\n💰 Totale: €{totale}\n\nIl preventivo è valido per 7 giorni.\n\nPer confermare, contattaci!\n\n{nome_agenzia}\n{telefono_agenzia}\n{email_agenzia}', 'Template per invio preventivo'),
  ('room_confirmation', 'Conferma Camera', 'Gentile Cliente,\n\nCamera confermata per il viaggio "{titolo_viaggio}"!\n\n🛏️ Tipo camera: {tipo_camera}\n👥 Occupanti: {occupanti}\n\n📅 Partenza: {data_partenza}\n📅 Rientro: {data_rientro}\n\n{nome_agenzia}\n{telefono_agenzia}', 'Template per conferma assegnazione camera')
ON CONFLICT (template_type) DO NOTHING;
