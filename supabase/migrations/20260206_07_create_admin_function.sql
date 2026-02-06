-- ============================================================================
-- CREATE ADMIN ASSIGNMENT FUNCTION
-- ============================================================================

-- Function to assign admin role by email
CREATE OR REPLACE FUNCTION public.assign_admin_role(p_email TEXT)
RETURNS TABLE(user_id UUID, email TEXT, status TEXT) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from email
  SELECT u.id INTO v_user_id
  FROM auth.users AS u
  WHERE u.email = p_email;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, p_email, 'Error: User not found'::TEXT;
    RETURN;
  END IF;

  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'User'))
  ON CONFLICT (id) DO NOTHING;

  -- Assign admin role
  DELETE FROM public.user_roles ur WHERE ur.user_id = v_user_id;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');

  -- Assign all admin permissions
  INSERT INTO public.role_permissions (role, permission)
  SELECT 'admin'::app_role, permission
  FROM (
    SELECT 'manage_trips'::permission_type 
    UNION SELECT 'delete_trips'::permission_type
    UNION SELECT 'manage_participants'::permission_type
    UNION SELECT 'manage_payments'::permission_type
    UNION SELECT 'manage_bus'::permission_type
    UNION SELECT 'manage_carriers'::permission_type
    UNION SELECT 'view_prices'::permission_type
    UNION SELECT 'manage_hotels'::permission_type
    UNION SELECT 'view_activity_logs'::permission_type
  ) AS perms(permission)
  ON CONFLICT (role, permission) DO NOTHING;

  RETURN QUERY SELECT v_user_id, p_email, 'Admin role assigned successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
