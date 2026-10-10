-- Development preparation only. Not applied on startup or to production.
-- Requires live schema/ledger review and the migration runner before release.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Refuse drift instead of silently reusing incompatible IF NOT EXISTS columns.
DO $$ BEGIN
 IF EXISTS (
  SELECT 1 FROM (VALUES ('addresses','id','uuid'),('addresses','code','text'),('addresses','status','text'),('addresses','source','text'),('users','id','uuid'),('address_media','address_id','uuid')) expected(relation,name,kind)
  LEFT JOIN information_schema.columns c ON c.table_schema='ad507' AND c.table_name=expected.relation AND c.column_name=expected.name
  WHERE c.data_type IS DISTINCT FROM expected.kind
 ) THEN RAISE EXCEPTION 'REQUEST_FOUNDATION_SCHEMA_NOT_VERIFIED'; END IF;
 IF EXISTS (
  SELECT 1 FROM (VALUES ('addresses','request_key_hash','text'),('addresses','request_payload_hash','text'),('addresses','request_data','jsonb'),('addresses','review_decision','text'),('addresses','reviewed_by','uuid'),('addresses','publication_receipt','text'),('address_media','upload_status','text')) expected(relation,name,kind)
  JOIN information_schema.columns c ON c.table_schema='ad507' AND c.table_name=expected.relation AND c.column_name=expected.name
  WHERE c.data_type<>expected.kind
 ) THEN RAISE EXCEPTION 'REQUEST_COLUMN_COLLISION'; END IF;
END $$;
ALTER TABLE ad507.addresses ALTER COLUMN code DROP NOT NULL;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS request_key_hash text;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS request_payload_hash text;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS request_data jsonb;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS review_decision text;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES ad507.users(id);
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS publication_receipt text;
ALTER TABLE ad507.address_media ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'READY';
CREATE UNIQUE INDEX IF NOT EXISTS core_requests_key_uidx ON ad507.addresses(request_key_hash) WHERE request_key_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS core_requests_payload_uidx ON ad507.addresses(request_payload_hash) WHERE request_payload_hash IS NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.addresses'::regclass AND conname='core_requests_uncoded_check') THEN
  ALTER TABLE ad507.addresses ADD CONSTRAINT core_requests_uncoded_check CHECK(code IS NOT NULL OR (source='USER_REQUEST' AND request_key_hash IS NOT NULL AND status IN ('DRAFT','PENDING_REVIEW','ARCHIVED')));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.addresses'::regclass AND conname='core_requests_decision_check') THEN
  ALTER TABLE ad507.addresses ADD CONSTRAINT core_requests_decision_check CHECK(review_decision IS NULL OR review_decision IN ('APPROVED','REJECTED'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ad507.address_media'::regclass AND conname='core_media_upload_status_check') THEN
  ALTER TABLE ad507.address_media ADD CONSTRAINT core_media_upload_status_check CHECK(upload_status IN ('PENDING','READY'));
 END IF;
END $$;
COMMIT;
