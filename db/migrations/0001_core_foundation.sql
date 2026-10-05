BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS ad507;

CREATE TABLE IF NOT EXISTS ad507.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, display_name text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED','BLOCKED')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS core_users_email_lower_uidx ON ad507.users (lower(email));

CREATE TABLE IF NOT EXISTS ad507.user_roles (
  user_id uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('CLIENT','OPERATOR','ADMIN')), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS ad507.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ad507.plan_capabilities (
  plan_id uuid NOT NULL REFERENCES ad507.plans(id) ON DELETE CASCADE, capability text NOT NULL,
  value_json jsonb NOT NULL DEFAULT 'true'::jsonb, PRIMARY KEY (plan_id, capability)
);

CREATE TABLE IF NOT EXISTS ad507.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^AD507-[A-Z0-9_-]+$'),
  address_type text NOT NULL CHECK (address_type IN ('BUSINESS','RESIDENTIAL','PLACE')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_REVIEW','ACTIVE','SUSPENDED','ARCHIVED')),
  plan_id uuid REFERENCES ad507.plans(id) ON DELETE SET NULL, name text NOT NULL, reference text,
  description text, commercial_description text, latitude numeric(9,6), longitude numeric(9,6), phone text, hours text,
  source text NOT NULL DEFAULT 'SYSTEM', legacy_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90), CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);
CREATE INDEX IF NOT EXISTS core_addresses_type_status_idx ON ad507.addresses(address_type, status);
CREATE INDEX IF NOT EXISTS core_addresses_plan_idx ON ad507.addresses(plan_id);

CREATE TABLE IF NOT EXISTS ad507.address_ownership (
  address_id uuid NOT NULL REFERENCES ad507.addresses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
  ownership_role text NOT NULL DEFAULT 'OWNER' CHECK (ownership_role IN ('OWNER','MANAGER')),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (address_id, user_id)
);
CREATE INDEX IF NOT EXISTS core_address_ownership_user_idx ON ad507.address_ownership(user_id);

CREATE TABLE IF NOT EXISTS ad507.address_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), address_id uuid NOT NULL REFERENCES ad507.addresses(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE','LOGO')), storage_key text, url text,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0), is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), CHECK (storage_key IS NOT NULL OR url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS core_address_media_address_idx ON ad507.address_media(address_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS core_address_media_one_primary_idx ON ad507.address_media(address_id, media_type) WHERE is_primary;

CREATE TABLE IF NOT EXISTS ad507.address_socials (
  address_id uuid NOT NULL REFERENCES ad507.addresses(id) ON DELETE CASCADE, platform text NOT NULL, url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (address_id, platform)
);

CREATE TABLE IF NOT EXISTS ad507.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
  address_id uuid REFERENCES ad507.addresses(id) ON DELETE SET NULL, document_type text NOT NULL, document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(), ip_hash text, user_agent_hash text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS core_legal_acceptances_user_idx ON ad507.legal_acceptances(user_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS ad507.audit_log (
  id bigserial PRIMARY KEY, actor_user_id uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('USER','ADMIN','OPERATOR','NATALIE','SYSTEM')),
  action text NOT NULL, entity_type text NOT NULL, entity_id text, request_id text, before_json jsonb, after_json jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS core_audit_log_entity_idx ON ad507.audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS core_audit_log_actor_idx ON ad507.audit_log(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ad507.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
  address_id uuid REFERENCES ad507.addresses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','REFUNDED')),
  currency char(3) NOT NULL DEFAULT 'USD', amount_cents integer NOT NULL CHECK (amount_cents >= 0), provider text,
  provider_reference text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
