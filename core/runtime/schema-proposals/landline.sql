-- REVIEW ONLY. Not in db/migrations and not invoked by any runner or deployment.
-- Requires separate authorization, backup, ledger/version assignment and rollback review.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name='landline_phone' AND data_type<>'text') THEN
  RAISE EXCEPTION 'LANDLINE_COLUMN_COLLISION';
 END IF;
END $$;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS landline_phone text;
DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.addresses'::regclass AND conname='addresses_landline_phone_valid') THEN
ALTER TABLE ad507.addresses ADD CONSTRAINT addresses_landline_phone_valid
  CHECK (landline_phone IS NULL OR (
    landline_phone ~ '^[+0-9 ().-]{7,40}$'
    AND (length(regexp_replace(landline_phone, '[^0-9]', '', 'g')) IN (7,8)
      OR length(regexp_replace(landline_phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 15)
  ));
END IF; END $$;
COMMENT ON COLUMN ad507.addresses.landline_phone IS 'Optional fixed telephone; accepts the existing formatted Place draft contract or normalized international format. Independent of phone / WhatsApp; no backfill.';
COMMIT;
