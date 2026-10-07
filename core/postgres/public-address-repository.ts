export type SqlExecutor = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

export type PublicAddressRecord = {
  code: string;
  type: "BUSINESS" | "PLACE";
  name: string;
  reference: string | null;
  description: string | null;
  commercialDescription: string | null;
  coordinates: { latitude: number | null; longitude: number | null };
  phone: string | null;
  landlinePhone: string | null;
  hours: string | null;
  plan: { code: string; name: string } | null;
  capabilities: Record<string, unknown>;
  media: Array<{
    type: "IMAGE" | "LOGO";
    storageKey: string | null;
    url: string | null;
    position: number;
    primary: boolean;
  }>;
  socials: Array<{ platform: string; url: string }>;
};

type AddressRow = {
  code: string;
  address_type: "BUSINESS" | "PLACE";
  name: string;
  reference: string | null;
  description: string | null;
  commercial_description: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  phone: string | null;
  landline_phone: string | null;
  hours: string | null;
  plan_code: string | null;
  plan_name: string | null;
};

type CapabilityRow = { capability: string; value_json: unknown };
type MediaRow = {
  media_type: "IMAGE" | "LOGO";
  storage_key: string | null;
  url: string | null;
  position: number;
  is_primary: boolean;
};
type SocialRow = { platform: string; url: string };

export function postgresPublicReadEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_POSTGRES_PUBLIC_READ_ENABLED === "true";
}

export function normalizeAd507Code(raw: string): string | null {
  const code = String(raw || "").trim().toUpperCase();
  return /^AD507-[A-Z0-9_-]+$/.test(code) ? code : null;
}

function numberOrNull(value: string | number | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Read-only PostgreSQL repository for the future public Core route.
 *
 * Safety boundary:
 * - caller must check postgresPublicReadEnabled() before invoking it;
 * - only ACTIVE BUSINESS/PLACE records can resolve;
 * - no legacy_payload, ownership, user, Residential or secret data is selected;
 * - no Apps Script/GitHub/Google/Natalie network dependency exists here.
 */
export async function getPublicAddressByCode(
  sql: SqlExecutor,
  rawCode: string,
): Promise<PublicAddressRecord | null> {
  const code = normalizeAd507Code(rawCode);
  if (!code) return null;

  const rows = await sql<AddressRow>`
    SELECT
      a.code,
      a.address_type,
      a.name,
      a.reference,
      a.description,
      a.commercial_description,
      a.latitude,
      a.longitude,
      a.phone,
      a.landline_phone,
      a.hours,
      p.code AS plan_code,
      p.name AS plan_name
    FROM ad507.addresses a
    LEFT JOIN ad507.plans p ON p.id = a.plan_id
    WHERE a.code = ${code}
      AND a.status = 'ACTIVE'
      AND a.address_type IN ('BUSINESS', 'PLACE')
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const capabilities = row.plan_code
    ? await sql<CapabilityRow>`
        SELECT pc.capability, pc.value_json
        FROM ad507.plan_capabilities pc
        JOIN ad507.plans p ON p.id = pc.plan_id
        WHERE p.code = ${row.plan_code}
      `
    : [];

  const capabilityMap = Object.fromEntries(
    capabilities.map((item) => [item.capability, item.value_json]),
  );

  const media = await sql<MediaRow>`
    SELECT media_type, storage_key, url, position, is_primary
    FROM ad507.address_media
    WHERE address_id = (
      SELECT id FROM ad507.addresses WHERE code = ${code} LIMIT 1
    )
    ORDER BY position ASC, created_at ASC
  `;

  const socialNetworksAllowed = capabilityMap.social_networks === true;
  const socials = socialNetworksAllowed
    ? await sql<SocialRow>`
        SELECT platform, url
        FROM ad507.address_socials
        WHERE address_id = (
          SELECT id FROM ad507.addresses WHERE code = ${code} LIMIT 1
        )
        ORDER BY platform ASC
      `
    : [];

  return {
    code: row.code,
    type: row.address_type,
    name: row.name,
    reference: row.reference,
    description: row.description,
    commercialDescription: row.commercial_description,
    coordinates: {
      latitude: numberOrNull(row.latitude),
      longitude: numberOrNull(row.longitude),
    },
    phone: row.phone,
    landlinePhone: row.landline_phone,
    hours: row.hours,
    plan: row.plan_code && row.plan_name ? { code: row.plan_code, name: row.plan_name } : null,
    capabilities: capabilityMap,
    media: media.map((item) => ({
      type: item.media_type,
      storageKey: item.storage_key,
      url: item.url,
      position: item.position,
      primary: item.is_primary,
    })),
    socials: socials.map((item) => ({ platform: item.platform, url: item.url })),
  };
}
