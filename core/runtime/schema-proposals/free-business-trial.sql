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
