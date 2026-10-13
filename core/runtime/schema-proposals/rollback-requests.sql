-- Operator-only rollback before accepting any new data. NEVER delete requests to force rollback.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM ad507.addresses WHERE code IS NULL OR request_key_hash IS NOT NULL OR request_payload_hash IS NOT NULL OR request_data IS NOT NULL OR review_decision IS NOT NULL OR reviewed_by IS NOT NULL OR publication_receipt IS NOT NULL OR landline_phone IS NOT NULL)
 OR EXISTS(SELECT 1 FROM ad507.address_media WHERE upload_status<>'READY')
 THEN RAISE EXCEPTION 'ROLLBACK_REQUIRES_DATA_PRESERVATION'; END IF;
END $$;
DROP INDEX IF EXISTS ad507.core_requests_key_uidx;
DROP INDEX IF EXISTS ad507.core_requests_payload_uidx;
DROP INDEX IF EXISTS ad507.core_addresses_normalized_code_uidx;
ALTER TABLE ad507.addresses DROP CONSTRAINT IF EXISTS core_requests_uncoded_check;
ALTER TABLE ad507.addresses DROP CONSTRAINT IF EXISTS core_requests_decision_check;
ALTER TABLE ad507.addresses DROP CONSTRAINT IF EXISTS addresses_landline_phone_valid;
ALTER TABLE ad507.addresses ALTER COLUMN code SET NOT NULL;
ALTER TABLE ad507.addresses DROP COLUMN request_key_hash,DROP COLUMN request_payload_hash,DROP COLUMN request_data,DROP COLUMN review_decision,DROP COLUMN reviewed_by,DROP COLUMN publication_receipt,DROP COLUMN landline_phone;
ALTER TABLE ad507.address_media DROP CONSTRAINT IF EXISTS core_media_upload_status_check;
ALTER TABLE ad507.address_media DROP COLUMN upload_status;
COMMIT;
