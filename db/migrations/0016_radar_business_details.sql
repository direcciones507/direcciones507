-- Staging only, after ownership.sql; never applied by the web process.
BEGIN;
CREATE TABLE radar.business_details (
 establishment_id uuid PRIMARY KEY REFERENCES radar.establishments(id) ON DELETE CASCADE,
 hours jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(hours)='object'),
 quantity integer CHECK (quantity BETWEEN 0 AND 100000),
 unit text NOT NULL DEFAULT 'units' CHECK (unit IN ('tables','rooms','places','units')),
 updated_by uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE radar.ownership_requests (
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 account_ref uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 500),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (establishment_id,account_ref)
);
CREATE INDEX radar_ownership_requests_account ON radar.ownership_requests(account_ref);
COMMIT;
