-- REVIEW ONLY. Apply through an authorized ledger release, never on startup.
-- Requires requests.sql, countries.sql, payments.sql and paypal.sql. No backfill.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE ad507.plan_terms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 address_id uuid NOT NULL REFERENCES ad507.addresses(id),
 order_id uuid UNIQUE REFERENCES ad507.orders(id),
 kind text NOT NULL CHECK(kind IN ('INITIAL','RENEWAL')),
 plan_code text NOT NULL, country_code text NOT NULL,
 starts_at timestamptz NOT NULL, expires_at timestamptz,
 period_days integer CHECK(period_days BETWEEN 1 AND 3660),
 accepted_at timestamptz, policy_version text NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at IS NULL OR expires_at>starts_at),
 CHECK((expires_at IS NULL AND period_days IS NULL) OR (expires_at IS NOT NULL AND period_days IS NOT NULL)),
 CHECK(kind<>'RENEWAL' OR order_id IS NOT NULL)
);
CREATE UNIQUE INDEX plan_initial_term_uidx ON ad507.plan_terms(address_id) WHERE kind='INITIAL';
CREATE INDEX plan_terms_expiry_idx ON ad507.plan_terms(expires_at,address_id);
CREATE TABLE ad507.plan_mail_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), term_id uuid NOT NULL REFERENCES ad507.plan_terms(id),
 kind text NOT NULL CHECK(kind IN ('DELIVERY','RENEWED','D15','D7','D1','EXPIRED')),
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','SENDING','SENT','FAILED','CANCELLED','UNCERTAIN')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz, sent_at timestamptz, provider_id text,
 last_error text, payload jsonb, UNIQUE(term_id,kind)
);
CREATE INDEX plan_mail_pending_idx ON ad507.plan_mail_outbox(state,available_at);
CREATE TABLE ad507.plan_renewals (
 order_id uuid PRIMARY KEY REFERENCES ad507.orders(id), address_id uuid NOT NULL REFERENCES ad507.addresses(id),
 user_id uuid REFERENCES ad507.users(id) ON DELETE SET NULL, period_days integer NOT NULL CHECK(period_days BETWEEN 1 AND 3660),
 accepted_at timestamptz NOT NULL DEFAULT now(), policy_version text NOT NULL
);
-- Reuse the payment ledger; permit successive voluntarily purchased periods,
-- while allowing only one unresolved provider intent per address/environment.
DROP INDEX ad507.core_payment_address_environment_uidx;
CREATE UNIQUE INDEX core_payment_address_environment_uidx ON ad507.orders(address_id,payment_environment)
 WHERE provider IN ('YAPPY','PAYPAL') AND status='PENDING';
-- Permanent tombstones survive attempted address deletion, no reassignment.
CREATE TABLE ad507.address_identity_reservations (
 code text PRIMARY KEY, address_id uuid NOT NULL UNIQUE REFERENCES ad507.addresses(id), reserved_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION ad507.preserve_managed_address_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF EXISTS(SELECT 1 FROM ad507.address_identity_reservations WHERE code=upper(trim(NEW.code))) THEN RAISE EXCEPTION 'PERMANENT_CODE_RESERVED'; END IF;
   RETURN NEW;
 END IF;
 IF EXISTS(SELECT 1 FROM ad507.address_identity_reservations WHERE address_id=OLD.id)
    AND (TG_OP='DELETE' OR NEW.code IS DISTINCT FROM OLD.code OR NEW.id IS DISTINCT FROM OLD.id) THEN
   RAISE EXCEPTION 'PERMANENT_CODE_RESERVED';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.code IS DISTINCT FROM OLD.code AND EXISTS(SELECT 1 FROM ad507.address_identity_reservations WHERE code=upper(trim(NEW.code))) THEN RAISE EXCEPTION 'PERMANENT_CODE_RESERVED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_managed_address_identity BEFORE INSERT OR UPDATE OR DELETE ON ad507.addresses
 FOR EACH ROW EXECUTE FUNCTION ad507.preserve_managed_address_identity();
COMMIT;
