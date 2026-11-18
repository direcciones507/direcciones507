-- REVIEW ONLY. Pagadito Sandbox support for existing Core order ledger.
-- Apply through the reviewed migration process only after validating all
-- existing order constraints and test data. NEVER run at application startup.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $$ BEGIN
 IF to_regclass('ad507.orders') IS NULL THEN
   RAISE EXCEPTION 'PAYMENT_FOUNDATION_REQUIRED';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='ad507' AND table_name='orders'
     AND column_name='operation_key' AND data_type='text'
 ) THEN RAISE EXCEPTION 'PAYMENT_LEDGER_MIGRATION_REQUIRED'; END IF;
 IF EXISTS (
   SELECT 1 FROM ad507.orders
   WHERE provider='PAGADITO'
 ) THEN RAISE EXCEPTION 'PAGADITO_EXISTING_ORDERS_REQUIRE_MANUAL_REVIEW'; END IF;
END $$;

-- The existing payment_environment uses 'test' for provider sandboxes.
-- Reuse that convention; never introduce a new 'sandbox' enum value.
ALTER TABLE ad507.orders
 ADD CONSTRAINT core_pagadito_order_binding_check
 CHECK (provider IS DISTINCT FROM 'PAGADITO' OR (
   user_id IS NOT NULL AND address_id IS NOT NULL
   AND payment_plan IS NOT NULL AND payment_environment='test'
   AND operation_key IS NOT NULL AND amount_cents>0 AND currency='USD'
 ));
CREATE UNIQUE INDEX core_pagadito_operation_uidx
 ON ad507.orders(operation_key) WHERE provider='PAGADITO';
CREATE UNIQUE INDEX core_pagadito_reference_uidx
 ON ad507.orders(payment_environment,provider_reference)
 WHERE provider='PAGADITO' AND provider_reference IS NOT NULL;

-- Cross-provider protection: the existing index is only for Yappy/PayPal.
-- A separate index including all three would overlap it, but is intentional:
-- no second order may be created for the same address in the same environment.
CREATE UNIQUE INDEX core_payment_address_environment_all_providers_uidx
 ON ad507.orders(address_id,payment_environment)
 WHERE provider IN ('YAPPY','PAYPAL','PAGADITO');

COMMIT;
