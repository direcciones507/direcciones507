-- Operator-only, BEFORE rollback-requests.sql and BEFORE admitting any new requests.
-- Never delete data or use CASCADE to force a rollback.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM ad507.addresses WHERE country_code<>'PA' OR source='USER_REQUEST') THEN
  RAISE EXCEPTION 'COUNTRY_ROLLBACK_REQUIRES_DATA_PRESERVATION';
 END IF;
END $$;
DROP INDEX IF EXISTS ad507.core_country_status_idx;
ALTER TABLE ad507.addresses DROP CONSTRAINT core_request_country_consistency_check;
ALTER TABLE ad507.addresses DROP CONSTRAINT core_country_code_check;
ALTER TABLE ad507.addresses DROP CONSTRAINT core_country_check;
ALTER TABLE ad507.addresses ADD CONSTRAINT addresses_code_check CHECK(code ~ '^AD507-[A-Z0-9_-]+$');
ALTER TABLE ad507.addresses DROP COLUMN country_code;
COMMIT;
