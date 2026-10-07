import type { SqlExecutor } from "./public-address-repository";

export type InternalMapPoint = {
  code: string;
  type: "BUSINESS" | "PLACE";
  name: string;
  latitude: number;
  longitude: number;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
};

type MapRow = {
  code: string;
  address_type: "BUSINESS" | "PLACE";
  name: string;
  latitude: string | number;
  longitude: string | number;
  status: InternalMapPoint["status"];
};

/**
 * Internal-only map dataset. This is deliberately broader than the future public map:
 * operators can inspect draft/review/suspended points to detect bad coordinates and duplicates.
 * Residential records are excluded unconditionally.
 */
export async function listInternalMapPoints(
  sql: SqlExecutor,
  input: { limit?: number } = {},
): Promise<InternalMapPoint[]> {
  const limit = Math.max(1, Math.min(5000, Math.trunc(input.limit ?? 1000)));
  const rows = await sql<MapRow>`
    SELECT code, address_type, name, latitude, longitude, status
    FROM ad507.addresses
    WHERE address_type IN ('BUSINESS', 'PLACE')
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    ORDER BY code ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    code: row.code,
    type: row.address_type,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status,
  }));
}
