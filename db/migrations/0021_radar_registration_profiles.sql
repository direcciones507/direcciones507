-- Apply through the official CORE migration system before enabling registration profiles.
BEGIN;
CREATE TABLE radar.registration_profiles (
 establishment_id uuid PRIMARY KEY REFERENCES radar.establishments(id) ON DELETE CASCADE,
 submitted_by uuid NOT NULL REFERENCES ad507.users(id) ON DELETE RESTRICT,
 profile jsonb NOT NULL CHECK (jsonb_typeof(profile)='object' AND octet_length(profile::text)<=8000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX radar_registration_profiles_account ON radar.registration_profiles(submitted_by,created_at DESC);
-- A commercial declaration never inserts into verified_owners or grants account roles.
COMMIT;
