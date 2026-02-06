-- ============================================================================
-- CLEAN DATABASE - Remove all data while keeping structure
-- ============================================================================

-- Disabilitare temporaneamente i trigger
ALTER TABLE public.participants DISABLE TRIGGER trigger_auto_confirm_trip;

-- Eliminare i dati in ordine rispetto alle foreign keys
DELETE FROM public.bus_seat_assignments;
DELETE FROM public.bus_seat_tokens;
DELETE FROM public.booking_confirmation_tokens;
DELETE FROM public.bus_configurations;
DELETE FROM public.restaurants;
DELETE FROM public.payments;
DELETE FROM public.participants;
DELETE FROM public.quotes;
DELETE FROM public.hotels;
DELETE FROM public.trips;
DELETE FROM public.contract_payments;
DELETE FROM public.agency_contract;
DELETE FROM public.hotel_registry;
DELETE FROM public.whatsapp_templates;
DELETE FROM public.agency_settings;
DELETE FROM public.bus_types;

-- Riabilitare i trigger
ALTER TABLE public.participants ENABLE TRIGGER trigger_auto_confirm_trip;

-- Reset delle sequenze (se esistono)
ALTER SEQUENCE IF EXISTS public.bus_types_id_seq RESTART WITH 1;

-- Reinserisce un template di agenzia vuota
INSERT INTO public.agency_settings (business_name) VALUES ('') ON CONFLICT DO NOTHING;
