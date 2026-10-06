BEGIN;

-- Bootstrap the first real administrative user in the canonical identity model.
-- This does not create a parallel admin identity. Authentication must resolve
-- this row through ad507.users and authorization through ad507.user_roles.
WITH admin_user AS (
  INSERT INTO ad507.users (email, display_name, status)
  VALUES ('ventas@direcciones507.com', 'Direcciones507', 'ACTIVE')
  ON CONFLICT (lower(email)) DO UPDATE
    SET status = 'ACTIVE', updated_at = now()
  RETURNING id
),
resolved_admin AS (
  SELECT id FROM admin_user
  UNION ALL
  SELECT id FROM ad507.users
  WHERE lower(email) = 'ventas@direcciones507.com'
  LIMIT 1
)
INSERT INTO ad507.user_roles (user_id, role)
SELECT id, 'ADMIN' FROM resolved_admin
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
