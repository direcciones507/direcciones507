-- Review-only migration. Apply exclusively to an isolated Sandbox database.
BEGIN;
CREATE TABLE ad507.pagadito_sandbox_attempts (
 order_id uuid PRIMARY KEY REFERENCES ad507.orders(id),
 state text NOT NULL CHECK (state IN ('SUBMITTING','VERIFIED','UNCERTAIN')),
 authorization text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((state='VERIFIED')=(authorization IS NOT NULL))
);
-- No card numbers, CVV, tokens or raw payment replies are persisted.
COMMIT;
