-- Manual authorized release 2026-10-15. NOT run on startup.
-- Original proposal SHA256s registered atomically; SQL bodies unchanged.
-- Requires verified backup and six baseline checksums. Refuses reapplication/drift.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE ad507.schema_migrations IN EXCLUSIVE MODE;
DO $guard$ BEGIN
IF (SELECT count(*) FROM ad507.schema_migrations)<>6 THEN RAISE EXCEPTION 'RELEASE_LEDGER_DRIFT'; END IF;
IF EXISTS(SELECT 1 FROM (VALUES ('0000','2d2fc979c92b28852001e5436e482c1a58b5c0e9a3e4e85fb02770f52c0d60b2'),('0001','967049a779a3c42a109746135cb36b0138eecee4a8b10ce1725dc8ca79461e4b'),('0002','08e9bc033406bd8915b25291089f39d0cc3f9ade355f3d0ee934618c16776f3b'),('0003','437e8941854f6f92a132ab527051a33057dbe524b1be83ee15c9347b42063fb8'),('0004','a532d74407229935caf7fccfc5994f8514f4cb34bad7ae06acfb8cd7e4117574'),('0005','53a965554c72250bbeb3e07b22046ffa26953f85447a66916395b12351048eb9')) x(v,c) LEFT JOIN ad507.schema_migrations m ON m.version=x.v WHERE m.checksum_sha256 IS DISTINCT FROM x.c) THEN RAISE EXCEPTION 'RELEASE_CHECKSUM_DRIFT'; END IF;
IF EXISTS(SELECT 1 FROM ad507.addresses) THEN RAISE EXCEPTION 'RELEASE_BASELINE_CHANGED'; END IF;
END $guard$;

-- REVIEW ONLY. Not in db/migrations and not invoked by any runner or deployment.
-- Requires separate authorization, backup, ledger/version assignment and rollback review.

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

INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by,metadata) VALUES ('0006','64b1043820c2c920ad8b037bb6742be4f71e8b7b95e0fb261a04425414a34396','landline.sql approved proposal',current_user,'{"git_sha":"c93f0d6ba3679fe9fc8539049b7cf591a5badfc6","release":"20261015","payments":false}'::jsonb);

-- Development preparation only. Not applied on startup or to production.
-- Requires live schema/ledger review and the migration runner before release.

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
CREATE UNIQUE INDEX IF NOT EXISTS core_addresses_normalized_code_uidx ON ad507.addresses(upper(trim(code))) WHERE code IS NOT NULL;
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

INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by,metadata) VALUES ('0007','8a3d98eafc0b1beb0348f1b1e28b3eda05e529b14c511ed4f6cc0f292d8464c0','requests.sql approved proposal',current_user,'{"git_sha":"c93f0d6ba3679fe9fc8539049b7cf591a5badfc6","release":"20261015","payments":false}'::jsonb);

-- PR52 additive proposal, AFTER PR51 landline.sql and requests.sql.
-- Not on startup, not a numbered/applied migration. Assign ledger sequence at release.

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

INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by,metadata) VALUES ('0008','6c13eedc5f298330a42b6a4fb1e835bdb42b580a97316048fe7a7ae2337da105','countries.sql approved proposal',current_user,'{"git_sha":"c93f0d6ba3679fe9fc8539049b7cf591a5badfc6","release":"20261015","payments":false}'::jsonb);
DO $verify$ BEGIN
IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='ad507' AND table_name='addresses' AND column_name IN ('landline_phone','request_key_hash','request_payload_hash','request_data','review_decision','reviewed_by','publication_receipt','country_code'))<>8 THEN RAISE EXCEPTION 'COMMERCIAL_COLUMNS_POSTCHECK'; END IF;
IF EXISTS(SELECT 1 FROM pg_constraint WHERE connamespace='ad507'::regnamespace AND NOT convalidated) THEN RAISE EXCEPTION 'UNVALIDATED_CONSTRAINT'; END IF;
IF to_regclass('ad507.core_addresses_normalized_code_uidx') IS NULL OR to_regclass('ad507.core_country_status_idx') IS NULL THEN RAISE EXCEPTION 'COMMERCIAL_INDEX_POSTCHECK'; END IF;
IF EXISTS(SELECT 1 FROM ad507.addresses) THEN RAISE EXCEPTION 'UNEXPECTED_ADDRESS_DATA_CHANGE'; END IF;
END $verify$;
COMMIT;
