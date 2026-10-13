import type { SqlExecutor } from './public-address-repository';

export type InternalMapPoint = {
  code: string;
  type: 'BUSINESS' | 'PLACE';
  name: string;
  latitude: number;
  longitude: number;
};

/**
 * Supplies the private Direcciones507 map dataset. The map UI can remain hidden
 * while points accumulate. Only ACTIVE public-capable records with valid stored
 * coordinates are eligible, keeping drafts and moderated-out records off-map.
 */
export async function getInternalMapPoints(
  sql: SqlExecutor,
  limit = 5000,
): Promise<InternalMapPoint[]> {
  const safeLimit = Math.max(1, Math.min(10000, Math.trunc(limit)));
  const rows = await sql<{
    code: string;
    address_type: 'BUSINESS' | 'PLACE';
    name: string;
    latitude: string | number;
    longitude: string | number;
  }>`
    SELECT code, address_type, name, latitude, longitude
    FROM ad507.addresses
    WHERE status = 'ACTIVE'
      AND address_type IN ('BUSINESS', 'PLACE')
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    ORDER BY code ASC
    LIMIT ${safeLimit}
  `;

  return rows.flatMap((row) => {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{ code: row.code, type: row.address_type, name: row.name, latitude, longitude }];
  });
}
