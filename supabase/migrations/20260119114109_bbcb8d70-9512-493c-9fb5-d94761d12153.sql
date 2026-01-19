-- Funzione per aggiornare automaticamente lo stato del viaggio a 'confirmed' quando raggiunge 25 partecipanti
CREATE OR REPLACE FUNCTION public.auto_confirm_trip_on_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_count INTEGER;
  current_status trip_status;
BEGIN
  -- Conta i partecipanti per il viaggio (esclude gli infant)
  SELECT COUNT(*) INTO participant_count
  FROM public.participants
  WHERE trip_id = NEW.trip_id AND is_infant = false;
  
  -- Ottieni lo stato attuale del viaggio
  SELECT status INTO current_status
  FROM public.trips
  WHERE id = NEW.trip_id;
  
  -- Se il viaggio è ancora in stato 'planned' e ha raggiunto 25 partecipanti, passa a 'confirmed'
  IF current_status = 'planned' AND participant_count >= 25 THEN
    UPDATE public.trips
    SET status = 'confirmed', updated_at = now()
    WHERE id = NEW.trip_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crea il trigger che si attiva dopo ogni inserimento di un partecipante
CREATE TRIGGER trigger_auto_confirm_trip
AFTER INSERT ON public.participants
FOR EACH ROW
WHEN (NEW.trip_id IS NOT NULL)
EXECUTE FUNCTION public.auto_confirm_trip_on_participants();