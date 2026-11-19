-- Staging only; apply after Radar schema and CORE migrations.
BEGIN;
ALTER TABLE radar.establishments ALTER COLUMN digital_address_ref TYPE uuid USING digital_address_ref::uuid;
ALTER TABLE radar.establishments ADD CONSTRAINT radar_core_address_fk FOREIGN KEY(digital_address_ref) REFERENCES ad507.addresses(id) ON DELETE SET NULL;
CREATE INDEX radar_core_address_idx ON radar.establishments(digital_address_ref) WHERE digital_address_ref IS NOT NULL;
COMMIT;
