BEGIN;

-- Bootstrap the first real administrative user in the canonical identity model.
-- Authentication resolves this row through ad507.users and authorization through
-- ad507.user_roles. No parallel administrative identity is created.
-- Existing user status is intentionally preserved: this migration never unblocks
-- or reactivates an existing identity.
INSERT INTO ad507.users (email, display_name, status)
SELECT 'ventas@direcciones507.com', 'Direcciones507', 'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM ad507.users WHERE lower(email) = 'ventas@direcciones507.com'
);

INSERT INTO ad507.user_roles (user_id, role)
SELECT id, 'ADMIN'
FROM ad507.users
WHERE lower(email) = 'ventas@direcciones507.com'
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
