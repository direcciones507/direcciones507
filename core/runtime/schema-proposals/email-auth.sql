-- Preparation only. Do not apply to production without backup/rollback approval.
-- Email identities reuse canonical ad507.users and ad507.auth_sessions.
BEGIN;
CREATE TABLE IF NOT EXISTS ad507.email_credentials (
  user_id uuid PRIMARY KEY REFERENCES ad507.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL CHECK (length(password_hash) BETWEEN 60 AND 512),
  email_verified_at timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ad507.email_auth_tokens (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_auth_tokens_user_purpose_idx ON ad507.email_auth_tokens(user_id,purpose);
CREATE INDEX IF NOT EXISTS email_auth_tokens_expiry_idx ON ad507.email_auth_tokens(expires_at);
COMMIT;
