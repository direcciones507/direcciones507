-- Radar only: anonymous community reports, with no synthetic CORE accounts.
-- The server must supply a keyed, pseudonymous digest; never store raw visitor identifiers.
BEGIN;
ALTER TABLE radar.activity_reports ALTER COLUMN account_ref DROP NOT NULL;
ALTER TABLE radar.activity_reports ADD COLUMN anonymous_ref text;
ALTER TABLE radar.activity_reports ADD CONSTRAINT radar_report_actor_identity CHECK (
 (account_ref IS NOT NULL AND anonymous_ref IS NULL)
 OR (account_ref IS NULL AND anonymous_ref IS NOT NULL AND anonymous_ref ~ '^[0-9a-f]{64}$' AND source='community')
);
CREATE INDEX radar_activity_anonymous_recent ON radar.activity_reports(anonymous_ref,created_at DESC) WHERE anonymous_ref IS NOT NULL;

-- Preserve the existing registered-account limits and transaction-level concurrency protection.
CREATE OR REPLACE FUNCTION radar.enforce_account_limits() RETURNS trigger
LANGUAGE plpgsql AS $radar$
BEGIN
 IF TG_TABLE_NAME = 'establishments' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('radar:' || NEW.account_ref::text,0));
  IF (SELECT count(*) FROM radar.establishments WHERE account_ref=NEW.account_ref AND created_at>clock_timestamp()-interval '24 hours') >= 10 THEN
   RAISE EXCEPTION 'Radar registration rate limit' USING ERRCODE='P4290';
  END IF;
 ELSE
  IF NEW.account_ref IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended('radar:' || NEW.account_ref::text,0));
   IF (SELECT count(*) FROM radar.activity_reports WHERE account_ref=NEW.account_ref AND created_at>clock_timestamp()-interval '1 minute') >= 6
    OR EXISTS (SELECT 1 FROM radar.activity_reports WHERE account_ref=NEW.account_ref AND establishment_id=NEW.establishment_id AND created_at>clock_timestamp()-interval '1 minute') THEN
    RAISE EXCEPTION 'Radar report rate limit' USING ERRCODE='P4290';
   END IF;
  ELSIF NEW.anonymous_ref IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended('radar:anonymous:' || NEW.anonymous_ref,0));
   IF (SELECT count(*) FROM radar.activity_reports WHERE anonymous_ref=NEW.anonymous_ref AND created_at>clock_timestamp()-interval '1 minute') >= 6
    OR EXISTS (SELECT 1 FROM radar.activity_reports WHERE anonymous_ref=NEW.anonymous_ref AND establishment_id=NEW.establishment_id AND created_at>clock_timestamp()-interval '1 minute') THEN
    RAISE EXCEPTION 'Radar anonymous report rate limit' USING ERRCODE='P4290';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$radar$;
COMMIT;
