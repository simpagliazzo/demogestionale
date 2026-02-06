-- ============================================================================
-- CREATE ADMIN USER AND PERMISSIONS
-- ============================================================================

-- Assign admin role to the test user
-- UUID: c9f15436-8269-43ec-a070-896f9ebfeca0
INSERT INTO public.user_roles (user_id, role)
VALUES ('c9f15436-8269-43ec-a070-896f9ebfeca0', 'admin')
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin';

-- Ensure admin has all permissions
INSERT INTO public.role_permissions (role, permission)
SELECT 'admin', permission
FROM (
  SELECT 'manage_trips' 
  UNION SELECT 'manage_participants'
  UNION SELECT 'manage_payments'
  UNION SELECT 'manage_quotes'
  UNION SELECT 'manage_hotels'
  UNION SELECT 'manage_buses'
  UNION SELECT 'manage_guides'
  UNION SELECT 'manage_users'
  UNION SELECT 'manage_settings'
  UNION SELECT 'view_analytics'
  UNION SELECT 'manage_agencies'
) AS perms(permission)
ON CONFLICT (role, permission) DO NOTHING;

-- Ensure user profile exists for the admin user
INSERT INTO public.profiles (id, full_name, phone)
SELECT 'c9f15436-8269-43ec-a070-896f9ebfeca0', 'Admin User', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'c9f15436-8269-43ec-a070-896f9ebfeca0');
