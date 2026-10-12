-- Preparation only: apply via the reviewed migration ledger, never on startup.
-- Reuses foundation orders and audit_log; does not create another payment store.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF to_regclass('ad507.orders') IS NULL THEN RAISE EXCEPTION 'PAYMENT_FOUNDATION_REQUIRED'; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='orders' AND column_name IN ('payment_plan','payment_environment','provider_order_id','operation_key','confirmed_at')) THEN
  RAISE EXCEPTION 'PAYMENT_PROPOSAL_ALREADY_PRESENT_REVIEW_LEDGER';
 END IF;
END $$;
ALTER TABLE ad507.orders ADD COLUMN payment_plan text;
ALTER TABLE ad507.orders ADD COLUMN payment_environment text CHECK(payment_environment IN ('test','production'));
ALTER TABLE ad507.orders ADD COLUMN provider_order_id text CHECK(provider_order_id ~ '^[A-Za-z0-9]{1,15}$');
ALTER TABLE ad507.orders ADD COLUMN operation_key text;
ALTER TABLE ad507.orders ADD COLUMN confirmed_at timestamptz;
ALTER TABLE ad507.orders ADD CONSTRAINT core_yappy_order_binding_check CHECK(provider IS DISTINCT FROM 'YAPPY' OR (user_id IS NOT NULL AND address_id IS NOT NULL AND payment_plan IS NOT NULL AND payment_environment IS NOT NULL AND provider_order_id IS NOT NULL AND operation_key IS NOT NULL AND amount_cents>0 AND currency='USD'));
CREATE UNIQUE INDEX core_yappy_provider_order_uidx ON ad507.orders(payment_environment,provider_order_id) WHERE provider='YAPPY';
CREATE UNIQUE INDEX core_yappy_operation_uidx ON ad507.orders(operation_key) WHERE provider='YAPPY';
CREATE UNIQUE INDEX core_yappy_reference_uidx ON ad507.orders(payment_environment,provider_reference) WHERE provider='YAPPY' AND provider_reference IS NOT NULL;
COMMIT;
