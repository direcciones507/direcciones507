-- Apply only in the approved migration sequence, after radar/schema.sql and CORE users exist.
-- Fail closed on orphaned identities. No destructive cleanup.
BEGIN;
ALTER TABLE radar.establishments ALTER COLUMN account_ref TYPE uuid USING account_ref::uuid;
ALTER TABLE radar.activity_reports ALTER COLUMN account_ref TYPE uuid USING account_ref::uuid;
ALTER TABLE radar.establishments ADD CONSTRAINT radar_establishment_core_user_fk FOREIGN KEY(account_ref) REFERENCES ad507.users(id) ON DELETE CASCADE;
ALTER TABLE radar.activity_reports ADD CONSTRAINT radar_report_core_user_fk FOREIGN KEY(account_ref) REFERENCES ad507.users(id) ON DELETE CASCADE;
COMMIT;
