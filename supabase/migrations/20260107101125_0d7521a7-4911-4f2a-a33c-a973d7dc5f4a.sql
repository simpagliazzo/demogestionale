-- Policy per blacklist
DROP POLICY IF EXISTS "Super admins can manage blacklist" ON public.blacklist;
CREATE POLICY "Super admins can manage blacklist" ON public.blacklist FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can view blacklist" ON public.blacklist;
CREATE POLICY "Super admins can view blacklist" ON public.blacklist FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per trips
DROP POLICY IF EXISTS "Super admin can manage trips" ON public.trips;
CREATE POLICY "Super admin can manage trips" ON public.trips FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per participants
DROP POLICY IF EXISTS "Super admin can manage participants" ON public.participants;
CREATE POLICY "Super admin can manage participants" ON public.participants FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per payments
DROP POLICY IF EXISTS "Super admin can manage payments" ON public.payments;
CREATE POLICY "Super admin can manage payments" ON public.payments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per user_roles
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per profiles - super admin può vedere tutti e gestire
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can manage profiles" ON public.profiles;
CREATE POLICY "Super admins can manage profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per role_permissions
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.role_permissions;
CREATE POLICY "Super admins can manage permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per activity_logs
DROP POLICY IF EXISTS "Super admin can view all logs" ON public.activity_logs;
CREATE POLICY "Super admin can view all logs" ON public.activity_logs FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per hotels
DROP POLICY IF EXISTS "Super admin can manage hotels" ON public.hotels;
CREATE POLICY "Super admin can manage hotels" ON public.hotels FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per rooms
DROP POLICY IF EXISTS "Super admin can manage rooms" ON public.rooms;
CREATE POLICY "Super admin can manage rooms" ON public.rooms FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per room_assignments
DROP POLICY IF EXISTS "Super admin can manage room assignments" ON public.room_assignments;
CREATE POLICY "Super admin can manage room assignments" ON public.room_assignments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per bus_carriers
DROP POLICY IF EXISTS "Super admin can manage carriers" ON public.bus_carriers;
CREATE POLICY "Super admin can manage carriers" ON public.bus_carriers FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per bus_types
DROP POLICY IF EXISTS "Super admin can manage bus types" ON public.bus_types;
CREATE POLICY "Super admin can manage bus types" ON public.bus_types FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per bus_configurations
DROP POLICY IF EXISTS "Super admin can manage bus config" ON public.bus_configurations;
CREATE POLICY "Super admin can manage bus config" ON public.bus_configurations FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per bus_seat_assignments
DROP POLICY IF EXISTS "Super admin can manage seat assignments" ON public.bus_seat_assignments;
CREATE POLICY "Super admin can manage seat assignments" ON public.bus_seat_assignments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy per quotes
DROP POLICY IF EXISTS "Super admin can manage quotes" ON public.quotes;
CREATE POLICY "Super admin can manage quotes" ON public.quotes FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));