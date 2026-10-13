import type { SqlExecutor } from './public-address-repository';

export type PublicPlaceSearchResult = {
  code: string;
  name: string;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
};

function normalizeSearchTerm(raw: string): string | null {
  const value = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (value.length < 2 || value.length > 80) return null;
  return value;
}

function numberOrNull(value: string | number | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Public PLACE discovery is fail-closed: only ACTIVE records are searchable.
 * The query is parameterized through SqlExecutor and returns a deliberately
 * small public projection with a hard result cap.
 */
export async function searchPublicPlaces(
  sql: SqlExecutor,
  rawTerm: string,
  limit = 20,
): Promise<PublicPlaceSearchResult[]> {
  const term = normalizeSearchTerm(rawTerm);
  if (!term) return [];
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const pattern = `%${term}%`;

  const rows = await sql<{
    code: string;
    name: string;
    reference: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
  }>`
    SELECT code, name, reference, latitude, longitude
    FROM ad507.addresses
    WHERE address_type = 'PLACE'
      AND status = 'ACTIVE'
      AND (name ILIKE ${pattern} OR reference ILIKE ${pattern})
    ORDER BY name ASC, code ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    reference: row.reference,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
  }));
}
