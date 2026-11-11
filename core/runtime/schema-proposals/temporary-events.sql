-- Dirección Temporal: isolated schema proposal. NOT applied automatically.
-- Review against live PostgreSQL schema, ledger and backup before migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE SCHEMA IF NOT EXISTS ad507;
CREATE TABLE ad507.temporary_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES ad507.users(id),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
  description text NOT NULL DEFAULT '',
  responsible_name text NOT NULL,
  responsible_email text NOT NULL,
  responsible_phone text NOT NULL,
  public_contact_name text,
  public_contact_phone text,
  public_contact_consent boolean NOT NULL DEFAULT false,
  country_code text NOT NULL,
  region text NOT NULL,
  municipality text NOT NULL,
  locality text NOT NULL,
  reference text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  event_timezone text NOT NULL,
  hours_description text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','AWAITING_PAYMENT','ACTIVE','EXPIRED','CANCELLED')),
  price_cents integer NOT NULL DEFAULT 799 CHECK(price_cents=799),
  currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  payment_order_id uuid UNIQUE,
  payment_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on AND ends_on - starts_on BETWEEN 0 AND 29),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)),
  CHECK (public_contact_consent OR (public_contact_name IS NULL AND public_contact_phone IS NULL)),
  CHECK (status <> 'ACTIVE' OR (payment_order_id IS NOT NULL AND payment_confirmed_at IS NOT NULL))
);
CREATE INDEX temporary_events_owner_idx ON ad507.temporary_events(owner_user_id,created_at DESC);
CREATE INDEX temporary_events_status_end_idx ON ad507.temporary_events(status,ends_on);
CREATE TABLE ad507.temporary_event_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES ad507.temporary_events(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 3),
  object_key text NOT NULL,
  mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 8388608),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,slot)
);
COMMENT ON TABLE ad507.temporary_events IS 'Proposal only. Never expose responsible contact fields or publish before verified payment.';
COMMIT;
