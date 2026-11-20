-- Owner-declared business identity. Not exposed through the public Radar API.
-- Apply with official CORE migration procedure before enabling RADAR_OWNER_PRIVATE_ENABLED.
BEGIN;
CREATE TABLE radar.owner_private_declarations (
 establishment_id uuid PRIMARY KEY REFERENCES radar.establishments(id) ON DELETE CASCADE,
 submitted_by uuid NOT NULL REFERENCES ad507.users(id) ON DELETE RESTRICT,
 legal_name text NOT NULL CHECK (length(btrim(legal_name)) BETWEEN 2 AND 160),
 tax_identifier text NOT NULL CHECK (length(btrim(tax_identifier)) BETWEEN 3 AND 48),
 country text NOT NULL CHECK (country IN ('PA','CO','CR','GT','SV','HN','NI','MX')),
 submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX radar_private_declaration_account ON radar.owner_private_declarations(submitted_by,submitted_at DESC);
-- This table is never joined into the public establishment response.
COMMIT;
