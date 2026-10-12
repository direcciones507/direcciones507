-- PR52 additive proposal, AFTER PR51 landline.sql and requests.sql.
-- Not on startup, not a numbered/applied migration. Assign ledger sequence at release.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name='request_data' AND data_type='jsonb') THEN
  RAISE EXCEPTION 'REQUEST_FOUNDATION_REQUIRED';
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name='country_code') THEN
  RAISE EXCEPTION 'COUNTRY_PROPOSAL_ALREADY_PRESENT_REVIEW_LEDGER';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ad507.addresses'::regclass AND conname='addresses_code_check' AND contype='c' AND pg_get_constraintdef(oid) LIKE '%^AD507-[A-Z0-9_-]+$%') THEN
  RAISE EXCEPTION 'COUNTRY_CODE_CONSTRAINT_NOT_VERIFIED';
 END IF;
END $$;
ALTER TABLE ad507.addresses ADD COLUMN country_code text NOT NULL DEFAULT 'PA';
ALTER TABLE ad507.addresses ADD CONSTRAINT core_country_check CHECK(country_code IN ('PA','CO','CR','GT','SV','HN','NI','MX','PE','EC'));
ALTER TABLE ad507.addresses DROP CONSTRAINT addresses_code_check;
ALTER TABLE ad507.addresses ADD CONSTRAINT core_country_code_check CHECK(code IS NULL OR code ~ (
 '^AD'||CASE country_code WHEN 'PA' THEN '507' WHEN 'CO' THEN '57' WHEN 'CR' THEN '506' WHEN 'GT' THEN '502' WHEN 'SV' THEN '503' WHEN 'HN' THEN '504' WHEN 'NI' THEN '505' WHEN 'MX' THEN '52' WHEN 'PE' THEN '51' WHEN 'EC' THEN '593' END||'-[A-Z0-9_-]+$'));
ALTER TABLE ad507.addresses ADD CONSTRAINT core_request_country_consistency_check CHECK(request_data->>'countryCode' IS NULL OR request_data->>'countryCode'=country_code);
-- Existing UNIQUE(code), normalized-code and request idempotency indexes retained.
CREATE INDEX core_country_status_idx ON ad507.addresses(country_code,status);
COMMIT;
