-- PR52 review-only addition AFTER PR51 payments.sql. No startup or production runner.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ad507' AND table_name='orders' AND column_name='operation_key' AND data_type='text') THEN
  RAISE EXCEPTION 'PAYMENT_FOUNDATION_REQUIRED';
 END IF;
END $$;
ALTER TABLE ad507.orders ADD CONSTRAINT core_paypal_order_binding_check CHECK(provider IS DISTINCT FROM 'PAYPAL' OR (user_id IS NOT NULL AND address_id IS NOT NULL AND payment_plan IS NOT NULL AND payment_environment IS NOT NULL AND payment_environment='test' AND provider_order_id IS NOT NULL AND operation_key IS NOT NULL AND amount_cents>0 AND currency='USD'));
CREATE UNIQUE INDEX core_paypal_operation_uidx ON ad507.orders(operation_key) WHERE provider='PAYPAL';
CREATE UNIQUE INDEX core_paypal_reference_uidx ON ad507.orders(payment_environment,provider_reference) WHERE provider='PAYPAL' AND provider_reference IS NOT NULL;
-- One immutable intent per address/environment across methods, even after timeouts/cancellation.
-- Refuse existing conflicts; reconcile under separately reviewed release before applying.
CREATE UNIQUE INDEX core_payment_address_environment_uidx ON ad507.orders(address_id,payment_environment) WHERE provider IN ('YAPPY','PAYPAL');
COMMIT;
