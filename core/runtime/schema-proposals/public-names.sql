-- Manual, additive proposal only. Never run at startup or against production without approval.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF to_regclass('ad507.public_name_reservations') IS NOT NULL THEN
  RAISE EXCEPTION 'PUBLIC_NAMES_ALREADY_PRESENT_REVIEW_LEDGER';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name='request_data' AND data_type='jsonb') OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name='publication_receipt') THEN
  RAISE EXCEPTION 'REQUEST_FOUNDATION_REQUIRED';
 END IF;
END $$;
CREATE TABLE ad507.public_name_reservations (
 public_name text PRIMARY KEY CHECK(public_name ~ '^[A-Z0-9][A-Z0-9-]{0,79}$'),
 address_id uuid NOT NULL UNIQUE REFERENCES ad507.addresses(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('PREMIUM','PRO')),
 country_code text NOT NULL CHECK(country_code IN ('PA','CR','CO','GT','SV','HN','NI','MX')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='PRO' AND public_name ~ '^[A-Z0-9]{1,60}$') OR (kind='PREMIUM' AND public_name ~ '^AD[0-9]{2,3}-[A-Z0-9]{1,60}$'))
);
-- Names are never released by archive, plan expiry, refund or ownership transfer.
COMMIT;
