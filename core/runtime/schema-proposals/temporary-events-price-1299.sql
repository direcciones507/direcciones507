-- Manual, guarded price migration for Dirección Temporal. Do not execute without
-- PostgreSQL backup, schema preflight, and operator-controlled deployment.
-- Existing 799-cent orders/events remain valid for reconciliation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtext('ad507-temporary-price-1299'));
DO $$
BEGIN
 IF current_database()<>'railway' AND current_database() NOT LIKE 'temporary_%' THEN
  RAISE EXCEPTION 'WRONG_DATABASE';
 END IF;
 IF to_regclass('ad507.temporary_events') IS NULL
    OR to_regclass('ad507.temporary_event_orders') IS NULL THEN
  RAISE EXCEPTION 'TEMPORARY_EVENT_TABLES_REQUIRED';
 END IF;
END $$;
ALTER TABLE ad507.temporary_events
  DROP CONSTRAINT IF EXISTS temporary_events_price_cents_check;
ALTER TABLE ad507.temporary_events
  ADD CONSTRAINT temporary_events_price_cents_check
  CHECK (price_cents IN (799,1299));
ALTER TABLE ad507.temporary_events
  ALTER COLUMN price_cents SET DEFAULT 1299;
ALTER TABLE ad507.temporary_event_orders
  DROP CONSTRAINT IF EXISTS temporary_event_orders_amount_cents_check;
ALTER TABLE ad507.temporary_event_orders
  ADD CONSTRAINT temporary_event_orders_amount_cents_check
  CHECK (amount_cents IN (799,1299));
ALTER TABLE ad507.temporary_event_orders
  ALTER COLUMN amount_cents SET DEFAULT 1299;
COMMIT;
