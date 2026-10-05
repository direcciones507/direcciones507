BEGIN;

-- Canonical capability matrix. Explicit entitlements prevent inference from plan names.
WITH capability_seed(plan_code, capability, value_json) AS (
  VALUES
    ('BUSINESS_FREE','public_indexing','true'::jsonb),('BUSINESS_FREE','custom_code','false'::jsonb),
    ('BUSINESS_FREE','logo','true'::jsonb),('BUSINESS_FREE','business_photo','true'::jsonb),
    ('BUSINESS_FREE','gallery_max_images','0'::jsonb),('BUSINESS_FREE','social_networks','false'::jsonb),
    ('BUSINESS_FREE','postal_zone','false'::jsonb),('BUSINESS_FREE','maps','true'::jsonb),
    ('BUSINESS_FREE','waze','true'::jsonb),('BUSINESS_FREE','uber','true'::jsonb),
    ('BUSINESS_FREE','whatsapp','true'::jsonb),('BUSINESS_FREE','call','true'::jsonb),
    ('BUSINESS_FREE','share','true'::jsonb),('BUSINESS_FREE','qr','true'::jsonb),
    ('BUSINESS_FREE','hours','true'::jsonb),('BUSINESS_FREE','reference','true'::jsonb),
    ('BUSINESS_FREE','analytics_level','"BASIC"'::jsonb),

    ('BUSINESS_PREMIUM','public_indexing','true'::jsonb),('BUSINESS_PREMIUM','custom_code','true'::jsonb),
    ('BUSINESS_PREMIUM','logo','true'::jsonb),('BUSINESS_PREMIUM','business_photo','true'::jsonb),
    ('BUSINESS_PREMIUM','gallery_max_images','0'::jsonb),('BUSINESS_PREMIUM','social_networks','true'::jsonb),
    ('BUSINESS_PREMIUM','postal_zone','true'::jsonb),('BUSINESS_PREMIUM','maps','true'::jsonb),
    ('BUSINESS_PREMIUM','waze','true'::jsonb),('BUSINESS_PREMIUM','uber','true'::jsonb),
    ('BUSINESS_PREMIUM','whatsapp','true'::jsonb),('BUSINESS_PREMIUM','call','true'::jsonb),
    ('BUSINESS_PREMIUM','share','true'::jsonb),('BUSINESS_PREMIUM','qr','true'::jsonb),
    ('BUSINESS_PREMIUM','hours','true'::jsonb),('BUSINESS_PREMIUM','reference','true'::jsonb),
    ('BUSINESS_PREMIUM','analytics_level','"STANDARD"'::jsonb),
    ('BUSINESS_PREMIUM','monthly_report_on_request','true'::jsonb),

    ('BUSINESS_PREMIUM_PRO','public_indexing','true'::jsonb),('BUSINESS_PREMIUM_PRO','custom_code','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','logo','true'::jsonb),('BUSINESS_PREMIUM_PRO','business_photo','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','gallery_max_images','5'::jsonb),('BUSINESS_PREMIUM_PRO','social_networks','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','postal_zone','true'::jsonb),('BUSINESS_PREMIUM_PRO','maps','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','waze','true'::jsonb),('BUSINESS_PREMIUM_PRO','uber','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','whatsapp','true'::jsonb),('BUSINESS_PREMIUM_PRO','call','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','share','true'::jsonb),('BUSINESS_PREMIUM_PRO','qr','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','hours','true'::jsonb),('BUSINESS_PREMIUM_PRO','reference','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','analytics_level','"ADVANCED"'::jsonb),
    ('BUSINESS_PREMIUM_PRO','analytics_filters_trends','true'::jsonb),
    ('BUSINESS_PREMIUM_PRO','monthly_report_on_request','true'::jsonb),

    ('RESIDENTIAL','public_indexing','false'::jsonb),('RESIDENTIAL','maps','true'::jsonb),
    ('RESIDENTIAL','waze','true'::jsonb),('RESIDENTIAL','uber','true'::jsonb),
    ('RESIDENTIAL','qr','true'::jsonb),('RESIDENTIAL','temporary_sharing','true'::jsonb),
    ('RESIDENTIAL','owner_security','true'::jsonb),('RESIDENTIAL','analytics_level','"BASIC"'::jsonb)
)
INSERT INTO ad507.plan_capabilities (plan_id, capability, value_json)
SELECT p.id, s.capability, s.value_json
FROM capability_seed s
JOIN ad507.plans p ON p.code = s.plan_code
ON CONFLICT (plan_id, capability) DO UPDATE SET value_json = EXCLUDED.value_json;

-- CORPORATE_PRO remains without inferred capabilities until its exact matrix is confirmed.
COMMIT;
