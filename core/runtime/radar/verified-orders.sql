BEGIN;
-- Bound by a trusted Radar checkout before provider confirmation.
CREATE TABLE radar.verified_order_intents (
 order_id uuid PRIMARY KEY REFERENCES ad507.orders(id),
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 account_id uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
 product text NOT NULL CHECK (product IN ('annual','live','featured')),
 bound_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX radar_verified_order_establishment ON radar.verified_order_intents(establishment_id,product);
CREATE TABLE radar.verified_order_receipts (
 provider text NOT NULL,
 provider_reference text NOT NULL,
 order_id uuid NOT NULL UNIQUE REFERENCES ad507.orders(id),
 PRIMARY KEY(provider,provider_reference)
);
COMMIT;
