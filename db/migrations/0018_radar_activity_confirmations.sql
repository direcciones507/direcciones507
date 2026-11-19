-- Community validation is separate from the original report and never renews its expiry.
BEGIN;
CREATE TABLE radar.activity_confirmations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 report_id uuid NOT NULL REFERENCES radar.activity_reports(id) ON DELETE CASCADE,
 account_ref uuid REFERENCES ad507.users(id) ON DELETE CASCADE,
 anonymous_ref text,
 agrees boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT radar_confirmation_identity CHECK (
  (account_ref IS NOT NULL AND anonymous_ref IS NULL)
  OR (account_ref IS NULL AND anonymous_ref IS NOT NULL AND anonymous_ref ~ '^[0-9a-f]{64}$')
 )
);
CREATE UNIQUE INDEX radar_confirmation_account_once ON radar.activity_confirmations(report_id,account_ref) WHERE account_ref IS NOT NULL;
CREATE UNIQUE INDEX radar_confirmation_anonymous_once ON radar.activity_confirmations(report_id,anonymous_ref) WHERE anonymous_ref IS NOT NULL;
CREATE INDEX radar_confirmation_account_recent ON radar.activity_confirmations(account_ref,created_at DESC) WHERE account_ref IS NOT NULL;
CREATE INDEX radar_confirmation_anonymous_recent ON radar.activity_confirmations(anonymous_ref,created_at DESC) WHERE anonymous_ref IS NOT NULL;
CREATE FUNCTION radar.enforce_confirmation_limits() RETURNS trigger LANGUAGE plpgsql AS $radar$
DECLARE target radar.activity_reports%ROWTYPE; actor_key text;
BEGIN
 actor_key := CASE WHEN NEW.account_ref IS NOT NULL THEN 'account:' || NEW.account_ref::text ELSE 'anonymous:' || NEW.anonymous_ref END;
 PERFORM pg_advisory_xact_lock(hashtextextended('radar:confirm:' || actor_key,0));
 SELECT r.* INTO target FROM radar.activity_reports r JOIN radar.establishments e ON e.id=r.establishment_id
 WHERE r.id=NEW.report_id AND e.published AND r.created_at>clock_timestamp()-interval '30 minutes' AND r.created_at<=clock_timestamp();
 IF NOT FOUND THEN RAISE EXCEPTION 'Radar report unavailable' USING ERRCODE='P4040'; END IF;
 IF (NEW.account_ref IS NOT NULL AND NEW.account_ref=target.account_ref)
 OR (NEW.anonymous_ref IS NOT NULL AND NEW.anonymous_ref=target.anonymous_ref) THEN
  RAISE EXCEPTION 'Radar self confirmation' USING ERRCODE='P4090';
 END IF;
 IF (SELECT count(*) FROM radar.activity_confirmations c WHERE
 ((NEW.account_ref IS NOT NULL AND c.account_ref=NEW.account_ref) OR (NEW.anonymous_ref IS NOT NULL AND c.anonymous_ref=NEW.anonymous_ref))
 AND c.created_at>clock_timestamp()-interval '1 minute') >= 6
 OR EXISTS (SELECT 1 FROM radar.activity_confirmations c JOIN radar.activity_reports r ON r.id=c.report_id
 WHERE r.establishment_id=target.establishment_id AND c.created_at>clock_timestamp()-interval '1 minute'
 AND ((NEW.account_ref IS NOT NULL AND c.account_ref=NEW.account_ref) OR (NEW.anonymous_ref IS NOT NULL AND c.anonymous_ref=NEW.anonymous_ref))) THEN
  RAISE EXCEPTION 'Radar confirmation rate limit' USING ERRCODE='P4290';
 END IF;
 RETURN NEW;
END;
$radar$;
CREATE TRIGGER radar_confirmation_limits BEFORE INSERT ON radar.activity_confirmations FOR EACH ROW EXECUTE FUNCTION radar.enforce_confirmation_limits();
COMMIT;
