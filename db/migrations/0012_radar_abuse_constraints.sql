-- Staging migration, after core-constraints.sql.
BEGIN;
CREATE OR REPLACE FUNCTION radar.enforce_account_limits() RETURNS trigger
LANGUAGE plpgsql AS $radar$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('radar:' || NEW.account_ref::text,0));
 IF TG_TABLE_NAME = 'establishments' THEN
  IF (SELECT count(*) FROM radar.establishments WHERE account_ref=NEW.account_ref AND created_at>clock_timestamp()-interval '24 hours') >= 10 THEN
   RAISE EXCEPTION 'Radar registration rate limit' USING ERRCODE='P4290';
  END IF;
 ELSE
  IF (SELECT count(*) FROM radar.activity_reports WHERE account_ref=NEW.account_ref AND created_at>clock_timestamp()-interval '1 minute') >= 6
   OR EXISTS (SELECT 1 FROM radar.activity_reports WHERE account_ref=NEW.account_ref AND establishment_id=NEW.establishment_id AND created_at>clock_timestamp()-interval '1 minute') THEN
   RAISE EXCEPTION 'Radar report rate limit' USING ERRCODE='P4290';
  END IF;
 END IF;
 RETURN NEW;
END;
$radar$;
DROP TRIGGER IF EXISTS radar_registration_limits ON radar.establishments;
CREATE TRIGGER radar_registration_limits BEFORE INSERT ON radar.establishments FOR EACH ROW EXECUTE FUNCTION radar.enforce_account_limits();
DROP TRIGGER IF EXISTS radar_report_limits ON radar.activity_reports;
CREATE TRIGGER radar_report_limits BEFORE INSERT ON radar.activity_reports FOR EACH ROW EXECUTE FUNCTION radar.enforce_account_limits();
COMMIT;
