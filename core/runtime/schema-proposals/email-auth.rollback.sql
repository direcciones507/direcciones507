-- Roll back code/config first. Never remove registered credentials or recovery data.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM ad507.email_credentials) OR EXISTS(SELECT 1 FROM ad507.email_auth_tokens)
 THEN RAISE EXCEPTION 'EMAIL_ROLLBACK_REQUIRES_DATA_PRESERVATION'; END IF;
END $$;
DROP TABLE ad507.email_auth_tokens;
DROP TABLE ad507.email_credentials;
COMMIT;
