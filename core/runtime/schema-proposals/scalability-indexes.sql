-- PR52 review-only, AFTER countries.sql. No startup or productive execution.
-- Keyset ordering includes UUID tie-breaker; no total record cap.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE INDEX core_addresses_page_idx ON ad507.addresses(updated_at DESC,id DESC);
CREATE INDEX core_country_page_idx ON ad507.addresses(country_code,updated_at DESC,id DESC);
CREATE INDEX core_requests_page_idx ON ad507.addresses(created_at,id) WHERE status='PENDING_REVIEW';
CREATE INDEX core_country_requests_page_idx ON ad507.addresses(country_code,created_at,id) WHERE status='PENDING_REVIEW';
CREATE INDEX core_places_page_idx ON ad507.addresses(updated_at DESC,id DESC) WHERE address_type='PLACE';
CREATE INDEX core_country_places_page_idx ON ad507.addresses(country_code,updated_at DESC,id DESC) WHERE address_type='PLACE';
COMMIT;
