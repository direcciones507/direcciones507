BEGIN;
CREATE TABLE radar.alert_preferences (
 account_ref uuid NOT NULL,
 establishment_id uuid NOT NULL,
 activity text NOT NULL CHECK(activity IN ('available','queue','full','incident')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(account_ref,establishment_id,activity),
 FOREIGN KEY(account_ref,establishment_id) REFERENCES radar.favorites(account_ref,establishment_id) ON DELETE CASCADE
);
COMMIT;
