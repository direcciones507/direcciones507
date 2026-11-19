-- Additive authorization for courtesy events; payment receipts remain NULL.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('admin-billing-exemption-v1',0));
ALTER TABLE ad507.temporary_events ADD COLUMN IF NOT EXISTS admin_published_by uuid REFERENCES ad507.users(id);
ALTER TABLE ad507.temporary_events ADD COLUMN IF NOT EXISTS admin_published_at timestamptz;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='ad507.temporary_events'::regclass AND contype='c' AND conname<>'temporary_event_activation_authorized' AND pg_get_constraintdef(oid) LIKE '%status%ACTIVE%payment_order_id%payment_confirmed_at%'
 LOOP EXECUTE format('ALTER TABLE ad507.temporary_events DROP CONSTRAINT %I',c.conname); END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.temporary_events'::regclass AND conname='temporary_event_activation_authorized') THEN
  ALTER TABLE ad507.temporary_events ADD CONSTRAINT temporary_event_activation_authorized CHECK(status<>'ACTIVE' OR (payment_order_id IS NOT NULL AND payment_confirmed_at IS NOT NULL) OR (admin_published_by=owner_user_id AND admin_published_at IS NOT NULL));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.temporary_events'::regclass AND conname='temporary_event_admin_authorization_complete') THEN
  ALTER TABLE ad507.temporary_events ADD CONSTRAINT temporary_event_admin_authorization_complete CHECK((admin_published_by IS NULL AND admin_published_at IS NULL) OR (admin_published_by IS NOT NULL AND admin_published_at IS NOT NULL AND admin_published_by=owner_user_id));
 END IF;
END $$;
COMMIT;
