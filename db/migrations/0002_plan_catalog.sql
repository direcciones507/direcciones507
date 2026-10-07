BEGIN;

-- Canonical commercial catalog confirmed for Direcciones507.
-- Capabilities are intentionally NOT inferred from legacy plan names here.
INSERT INTO ad507.plans (code, name, status)
VALUES
  ('BUSINESS_FREE', 'Negocio Gratis', 'ACTIVE'),
  ('BUSINESS_PREMIUM', 'Premium', 'ACTIVE'),
  ('BUSINESS_PREMIUM_PRO', 'Premium Pro', 'ACTIVE'),
  ('RESIDENTIAL', 'Residencial', 'ACTIVE'),
  ('CORPORATE_PRO', 'Corporativo Pro', 'ACTIVE')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = now();

-- Renewal is a commercial operation, not a distinct feature plan.
COMMIT;
