BEGIN;
CREATE TABLE radar.annual_memberships (
 order_id uuid PRIMARY KEY REFERENCES ad507.orders(id),
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 account_id uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
 confirmed_at timestamptz NOT NULL,
 starts_at timestamptz NOT NULL CHECK (starts_at>=confirmed_at),
 ends_at timestamptz NOT NULL CHECK (ends_at=(starts_at AT TIME ZONE 'UTC' + interval '1 year') AT TIME ZONE 'UTC')
);
CREATE INDEX radar_annual_membership_lookup ON radar.annual_memberships(establishment_id,ends_at DESC);
COMMIT;
