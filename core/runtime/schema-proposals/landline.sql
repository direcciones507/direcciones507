-- REVIEW ONLY. Not in db/migrations and not invoked by any runner or deployment.
-- Requires separate authorization, backup, ledger/version assignment and rollback review.
BEGIN;
ALTER TABLE ad507.addresses ADD COLUMN landline_phone text;
ALTER TABLE ad507.addresses ADD CONSTRAINT addresses_landline_phone_valid
  CHECK (landline_phone IS NULL OR (
    landline_phone ~ '^[+0-9 ().-]{7,40}$'
    AND (length(regexp_replace(landline_phone, '[^0-9]', '', 'g')) IN (7,8)
      OR length(regexp_replace(landline_phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 15)
  ));
COMMENT ON COLUMN ad507.addresses.landline_phone IS 'Optional fixed telephone; accepts the existing formatted Place draft contract or normalized international format. Independent of phone / WhatsApp; no backfill.';
COMMIT;
