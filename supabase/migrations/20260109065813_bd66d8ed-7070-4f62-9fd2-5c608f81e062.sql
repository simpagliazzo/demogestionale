-- Permetti lettura pubblica di bus_configurations tramite token valido
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

-- Permetti lettura pubblica di bus_seat_assignments tramite token valido
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

-- Permetti lettura pubblica di trips tramite token valido
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

-- Permetti lettura pubblica di participants tramite token valido
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