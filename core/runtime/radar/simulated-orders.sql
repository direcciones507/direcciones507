-- Isolated simulated Radar orders. Never used to grant public entitlements.
BEGIN;
CREATE TABLE radar.simulated_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 ordering_account uuid NOT NULL REFERENCES ad507.users(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL,
 product text NOT NULL CHECK(product IN ('annual','live','featured')),
 amount_cents integer NOT NULL,
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz,
 simulated_until timestamptz,
 UNIQUE(ordering_account,request_key),
 CHECK((product='annual' AND amount_cents=999) OR (product='live' AND amount_cents=199) OR (product='featured' AND amount_cents=399)),
 CHECK((confirmed_at IS NULL AND simulated_until IS NULL) OR (confirmed_at IS NOT NULL AND simulated_until IS NOT NULL AND simulated_until>confirmed_at))
);
CREATE INDEX radar_simulated_orders_establishment ON radar.simulated_orders(establishment_id,created_at DESC);
COMMIT;
