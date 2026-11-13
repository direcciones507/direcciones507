-- Additive terms for new Core orders; no old amount, code, row or contract updates.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE ad507.commercial_payment_terms (
 order_id uuid PRIMARY KEY REFERENCES ad507.orders(id),
 address_id uuid NOT NULL REFERENCES ad507.addresses(id),
 payment_environment text NOT NULL CHECK(payment_environment IN ('test','production')),
 purpose text NOT NULL CHECK(purpose IN ('INITIAL','RENEWAL','INSTALLMENT','PLACE_AD')),
 cycle text NOT NULL CHECK(length(cycle) BETWEEN 1 AND 128),
 quote jsonb NOT NULL CHECK(jsonb_typeof(quote)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(address_id,payment_environment,purpose,cycle)
);
-- The prior one-order-ever index prevents renewals and a second installment.
-- Replace it with a deferred guard that preserves the old initial-order invariant
-- and allows only purpose-bound, separately deduplicated commercial intents.
DROP INDEX ad507.core_payment_address_environment_uidx;
CREATE INDEX core_payment_address_environment_lookup ON ad507.orders(address_id,payment_environment);
CREATE FUNCTION ad507.guard_commercial_order_intent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
 IF NEW.provider NOT IN ('YAPPY','PAYPAL') THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('commercial-order:'||NEW.address_id::text||':'||NEW.payment_environment,0));
 SELECT count(*) INTO n FROM ad507.orders o LEFT JOIN ad507.commercial_payment_terms t ON t.order_id=o.id
 WHERE o.address_id=NEW.address_id AND o.payment_environment=NEW.payment_environment AND o.provider IN ('YAPPY','PAYPAL') AND (t.order_id IS NULL OR t.purpose='INITIAL');
 IF n>1 THEN RAISE EXCEPTION 'INITIAL_PAYMENT_ALREADY_EXISTS' USING ERRCODE='23505'; END IF;
 IF EXISTS(SELECT 1 FROM ad507.commercial_payment_terms t WHERE t.order_id=NEW.id AND (t.address_id<>NEW.address_id OR t.payment_environment<>NEW.payment_environment OR (t.quote->>'amountCents')::integer<>NEW.amount_cents OR NEW.currency<>'USD')) THEN RAISE EXCEPTION 'COMMERCIAL_ORDER_BINDING_INVALID'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER core_commercial_order_intent AFTER INSERT ON ad507.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ad507.guard_commercial_order_intent();
COMMIT;
