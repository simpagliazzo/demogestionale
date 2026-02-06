-- ============================================================================
-- CREATE ADMIN USER AND PERMISSIONS
-- ============================================================================

-- Ensure user profile exists for the admin user
INSERT INTO public.profiles (id, full_name, phone)
SELECT 'c9f15436-8269-43ec-a070-896f9ebfeca0', 'Admin User', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'c9f15436-8269-43ec-a070-896f9ebfeca0');

-- Assign admin role to the test user
-- Delete existing roles for this user first, then insert
DELETE FROM public.user_roles WHERE user_id = 'c9f15436-8269-43ec-a070-896f9ebfeca0';

INSERT INTO public.user_roles (user_id, role)
VALUES ('c9f15436-8269-43ec-a070-896f9ebfeca0', 'admin');

-- Ensure admin has all permissions
INSERT INTO public.role_permissions (role, permission)
SELECT 'admin'::app_role, permission
FROM (
  SELECT 'manage_trips'::permission_type 
  UNION SELECT 'manage_participants'::permission_type
  UNION SELECT 'manage_payments'::permission_type
  UNION SELECT 'manage_quotes'::permission_type
  UNION SELECT 'manage_hotels'::permission_type
  UNION SELECT 'manage_bus'::permission_type
  UNION SELECT 'manage_carriers'::permission_type
  UNION SELECT 'view_prices'::permission_type
  UNION SELECT 'view_activity_logs'::permission_type
  UNION SELECT 'delete_trips'::permission_type
) AS perms(permission)
ON CONFLICT (role, permission) DO NOTHING;
