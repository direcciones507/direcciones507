-- Staging draft only. Not registered in the production migration ledger.
-- Existing account and address foreign keys must be resolved against CORE before activation.
CREATE SCHEMA IF NOT EXISTS radar;
CREATE TABLE IF NOT EXISTS radar.establishments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_ref text NOT NULL,
 digital_address_ref text,
 name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
 category text NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
 country text NOT NULL CHECK (country IN ('PA','CO','CR','GT','SV','HN','NI','MX')),
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS radar_establishment_location ON radar.establishments(country,latitude,longitude) WHERE published;
CREATE TABLE IF NOT EXISTS radar.activity_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 establishment_id uuid NOT NULL REFERENCES radar.establishments(id) ON DELETE CASCADE,
 account_ref text NOT NULL,
 state text NOT NULL CHECK (state IN ('available','queue','full','incident')),
 source text NOT NULL DEFAULT 'community' CHECK (source IN ('community','verified_owner')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS radar_activity_recent ON radar.activity_reports(establishment_id,created_at DESC);
-- Server must derive account_ref and source from authenticated CORE identity.
-- No public grants, automatic publishing, payments or production migrations here.

-- Initial duplicate guard: same normalized name, country and rounded coordinates (~11m latitude).
CREATE UNIQUE INDEX IF NOT EXISTS radar_establishment_duplicate ON radar.establishments(country,lower(trim(name)),round(latitude::numeric,4),round(longitude::numeric,4));

-- Support bounded account-level abuse checks without scanning all reports.
CREATE INDEX IF NOT EXISTS radar_activity_account_recent ON radar.activity_reports(account_ref,created_at DESC);
CREATE INDEX IF NOT EXISTS radar_registration_account_recent ON radar.establishments(account_ref,created_at DESC);
