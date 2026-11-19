BEGIN;
CREATE TABLE radar.campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('live','featured')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CANCELLED','APPROVED')),
 ordering_account uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at)
);
CREATE INDEX radar_campaign_lookup ON radar.campaigns(establishment_id,starts_at,ends_at) WHERE status='APPROVED';
COMMIT;
