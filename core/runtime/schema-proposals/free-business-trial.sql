-- PROPOSAL ONLY: DO NOT APPLY TO PRODUCTION WITHOUT REVIEW/BACKUP/AUTHORIZATION.
-- Add trial metadata to NEW user-requested business addresses, never legacy imports.
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS free_trial_started_at timestamptz;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS free_trial_ends_at timestamptz;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS free_trial_expired_at timestamptz;
ALTER TABLE ad507.addresses ADD COLUMN IF NOT EXISTS free_trial_discount_redeemed_at timestamptz;
CREATE INDEX IF NOT EXISTS addresses_free_trial_expiry_idx ON ad507.addresses(free_trial_ends_at) WHERE free_trial_expired_at IS NULL AND free_trial_ends_at IS NOT NULL;
-- The release must additionally gate ALL public readers on trial expiry (fail closed)
-- and atomically claim the one-time discount on a confirmed production payment.
-- A scheduled expiry worker is secondary; the public read gate is mandatory.

-- Permanent, append-only redemption registry. Never delete a record on expiration,
-- cancellation or address suspension. Does not alter legacy records.
CREATE TABLE IF NOT EXISTS ad507.free_business_trial_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 address_id uuid NOT NULL UNIQUE REFERENCES ad507.addresses(id),
 country_code text NOT NULL,
 business_name_normalized text NOT NULL,
 business_phone_normalized text NOT NULL,
 location_latitude numeric,
 location_longitude numeric,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 trial_ends_at timestamptz NOT NULL,
 created_by uuid,
 CHECK (length(business_name_normalized)>0),
 CHECK (length(business_phone_normalized)>=7),
 CHECK (trial_ends_at>claimed_at)
);
CREATE INDEX IF NOT EXISTS free_business_trial_claims_identity_idx
 ON ad507.free_business_trial_claims(country_code,business_name_normalized,business_phone_normalized);
CREATE INDEX IF NOT EXISTS free_business_trial_claims_phone_idx
 ON ad507.free_business_trial_claims(country_code,business_phone_normalized);
-- Do not add unconditional UNIQUE(phone) or UNIQUE(name): different businesses
-- may legitimately share a phone, name, building or coordinates.
-- A claim must be inserted atomically with approval after a serializable
-- identity review, and ambiguous matches require ADMIN adjudication.
