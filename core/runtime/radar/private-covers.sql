BEGIN;
-- Keep cleanup references after an establishment is removed.
CREATE TABLE radar.cover_objects (
 establishment_id uuid NOT NULL,
 storage_key text PRIMARY KEY,
 state text NOT NULL CHECK (state IN ('staged','cancelled','current','cleanup')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (storage_key ~ ('^radar/covers/' || establishment_id::text || '/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}[.]webp$'))
);
CREATE UNIQUE INDEX radar_cover_current ON radar.cover_objects(establishment_id) WHERE state='current';
CREATE INDEX radar_cover_cleanup ON radar.cover_objects(establishment_id,updated_at) WHERE state<>'current';
COMMIT;
