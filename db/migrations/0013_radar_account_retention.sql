-- Apply after core-constraints.sql and ownership.sql in staging.
-- Public establishments survive account deletion; ownership and reports cascade separately.
BEGIN;
ALTER TABLE radar.establishments ALTER COLUMN account_ref DROP NOT NULL;
ALTER TABLE radar.establishments DROP CONSTRAINT radar_establishment_core_user_fk;
ALTER TABLE radar.establishments ADD CONSTRAINT radar_establishment_core_user_fk FOREIGN KEY(account_ref) REFERENCES ad507.users(id) ON DELETE SET NULL;
COMMIT;
