BEGIN;
CREATE TABLE IF NOT EXISTS core_admin_access_identity (
 id BIGSERIAL PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL DEFAULT 'ADMIN',
 status TEXT NOT NULL DEFAULT 'PENDING',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (role = 'ADMIN'),
 CHECK (status IN ('PENDING','ACTIVE','DISABLED')),
 CHECK (email = lower(btrim(email)) AND email LIKE '%@%')
);
INSERT INTO core_admin_access_identity (email, role, status)
VALUES ('ventas@direcciones507.com','ADMIN','PENDING')
ON CONFLICT (email) DO NOTHING;
COMMIT;
