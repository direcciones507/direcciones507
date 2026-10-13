BEGIN;

CREATE SCHEMA IF NOT EXISTS ad507;

CREATE TABLE IF NOT EXISTS ad507.schema_migrations (
  version text PRIMARY KEY,
  checksum_sha256 text NOT NULL,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL,
  execution_ms integer CHECK (execution_ms IS NULL OR execution_ms >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE ad507.schema_migrations IS
  'Direcciones507 forward-only migration ledger. Contains migration metadata only; never store secrets here.';

COMMIT;
