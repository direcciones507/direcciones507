BEGIN;
-- Staging only; apply after core-constraints.sql.
CREATE TABLE IF NOT EXISTS radar.verified_owners (
 establishment_id uuid PRIMARY KEY REFERENCES radar.establishments(id) ON DELETE CASCADE,
 account_ref uuid NOT NULL REFERENCES ad507.users(id) ON DELETE CASCADE,
 verified_by uuid REFERENCES ad507.users(id) ON DELETE SET NULL,
 verified_at timestamptz NOT NULL DEFAULT now()
);
-- Only authorized server-side administrative verification may write this table.
-- No evidence videos or personal documents stored here.
COMMIT;
