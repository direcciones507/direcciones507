-- Private favorites, keyed exclusively by existing Core accounts.
BEGIN;
CREATE TABLE radar.favorites (
 account_ref uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(account_ref,establishment_id)
);
CREATE INDEX radar_favorites_recent ON radar.favorites(account_ref,created_at DESC);
CREATE FUNCTION radar.enforce_favorite_limit() RETURNS trigger LANGUAGE plpgsql AS $radar$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('radar:favorite:' || NEW.account_ref::text,0));
 IF EXISTS(SELECT 1 FROM radar.favorites WHERE account_ref=NEW.account_ref AND establishment_id=NEW.establishment_id) THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM radar.establishments WHERE id=NEW.establishment_id AND published) THEN
  RAISE EXCEPTION 'Radar establishment unavailable' USING ERRCODE='P4040';
 END IF;
 IF (SELECT count(*) FROM radar.favorites WHERE account_ref=NEW.account_ref)>=100 THEN
  RAISE EXCEPTION 'Radar favorite limit' USING ERRCODE='P4290';
 END IF;
 RETURN NEW;
END;
$radar$;
CREATE TRIGGER radar_favorite_limit BEFORE INSERT ON radar.favorites FOR EACH ROW EXECUTE FUNCTION radar.enforce_favorite_limit();
COMMIT;
