-- ============================================================================
-- POLICIES AND FUNCTIONS - RLS policies, triggers, and helper functions
-- ============================================================================

-- AGENCY SETTINGS POLICIES
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

-- WHATSAPP TEMPLATES POLICIES
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

-- AGENCY CONTRACT POLICIES
CREATE POLICY "Super admin can manage agency contract"
  ON public.agency_contract
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated can view contract status"
  ON public.agency_contract
  FOR SELECT
  USING (auth.role() = 'authenticated'::text);

-- CONTRACT PAYMENTS POLICIES
CREATE POLICY "Super admin can manage contract payments"
  ON public.contract_payments
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated can view contract payments"
  ON public.contract_payments
  FOR SELECT
  USING (auth.role() = 'authenticated'::text);

-- HOTEL REGISTRY POLICIES
CREATE POLICY "Staff can view hotel registry" ON public.hotel_registry
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage hotel registry" ON public.hotel_registry
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admin can manage hotel registry" ON public.hotel_registry
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Agents can manage hotel registry" ON public.hotel_registry
  FOR ALL USING (has_role(auth.uid(), 'agente'::app_role));

-- BOOKING CONFIRMATION TOKENS POLICIES
CREATE POLICY "Public can read valid booking confirmation tokens"
ON public.booking_confirmation_tokens
FOR SELECT
USING (expires_at > now());

CREATE POLICY "Public can confirm booking"
ON public.booking_confirmation_tokens
FOR UPDATE
USING (expires_at > now() AND confirmed_at IS NULL)
WITH CHECK (expires_at > now());

CREATE POLICY "Staff can manage booking confirmation tokens"
ON public.booking_confirmation_tokens
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agente'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- BUS SEAT TOKENS POLICIES
CREATE POLICY "Public can read bus config for valid bus seat token"
ON public.bus_configurations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bus_seat_tokens bst
    WHERE bst.trip_id = bus_configurations.trip_id
      AND bst.expires_at > now()
  )
);

CREATE POLICY "Public can read seat assignments for valid bus seat token"
ON public.bus_seat_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bus_seat_tokens bst
    JOIN public.bus_configurations bc ON bc.trip_id = bst.trip_id
    WHERE bc.id = bus_seat_assignments.bus_config_id
      AND bst.expires_at > now()
  )
);

CREATE POLICY "Public can read trips for valid bus seat token"
ON public.trips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bus_seat_tokens bst
    WHERE bst.trip_id = trips.id
      AND bst.expires_at > now()
  )
);

CREATE POLICY "Public can read participant for valid bus seat token"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bus_seat_tokens bst
    WHERE bst.participant_id = participants.id
      AND bst.expires_at > now()
  )
);

-- PARTICIPANT VIA CONFIRMATION TOKEN POLICIES
CREATE POLICY "Public can read participant via confirmation token"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_confirmation_tokens bct
    WHERE bct.participant_id = participants.id
    AND bct.expires_at > now()
  )
);

-- TRIP VIA CONFIRMATION TOKEN POLICIES
CREATE POLICY "Public can read trip via confirmation token"
ON public.trips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_confirmation_tokens bct
    WHERE bct.trip_id = trips.id
    AND bct.expires_at > now()
  )
);

-- AGENCY SETTINGS PUBLIC READ POLICY
CREATE POLICY "Public can read agency settings"
ON public.agency_settings
FOR SELECT
USING (true);

-- RESTAURANTS POLICIES
CREATE POLICY "Staff can manage restaurants"
ON public.restaurants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agente'::app_role));

CREATE POLICY "Staff can view restaurants"
ON public.restaurants
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agente'::app_role) OR has_role(auth.uid(), 'accompagnatore'::app_role));

CREATE POLICY "Super admin can manage restaurants"
ON public.restaurants
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- STORAGE POLICIES
CREATE POLICY "Public read access for agency assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'agency-assets');

CREATE POLICY "Authenticated users can upload agency assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'agency-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update agency assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'agency-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete agency assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'agency-assets' AND auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- TRIGGER: Auto confirm trip when reaching 25 participants (excluding infants)
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

-- TRIGGER: Update agency_settings updated_at
CREATE TRIGGER update_agency_settings_updated_at
BEFORE UPDATE ON public.agency_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- TRIGGER: Update whatsapp_templates updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- TRIGGER: Update agency_contract updated_at
CREATE TRIGGER update_agency_contract_updated_at
  BEFORE UPDATE ON public.agency_contract
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
