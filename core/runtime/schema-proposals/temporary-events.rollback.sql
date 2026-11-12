-- NEW event tables ONLY. Export event data first. Never run after live sales
-- without owner approval and a verified event backup. No historical tables touched.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE ad507.temporary_events DROP CONSTRAINT temporary_event_order_fk;
DROP TABLE ad507.temporary_event_orders;
DROP TABLE ad507.temporary_event_media;
DROP TABLE ad507.temporary_events;
COMMIT;
