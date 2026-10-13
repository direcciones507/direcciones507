BEGIN;
CREATE TABLE IF NOT EXISTS ad507.oauth_transactions (
  state_hash text PRIMARY KEY CHECK (length(state_hash)=64),
  binding_hash text NOT NULL CHECK (length(binding_hash)=64),
  verifier text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS core_oauth_expiry_idx ON ad507.oauth_transactions(expires_at);
CREATE TABLE IF NOT EXISTS ad507.google_identities (
  google_sub text PRIMARY KEY CHECK (length(google_sub) BETWEEN 1 AND 255),
  user_id uuid NOT NULL UNIQUE REFERENCES ad507.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ad507.auth_sessions (
  session_hash text PRIMARY KEY CHECK (length(session_hash)=64),
  user_id uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS core_auth_sessions_user_idx ON ad507.auth_sessions(user_id);
COMMIT;
