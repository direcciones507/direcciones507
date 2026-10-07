import type { SqlExecutor } from "./public-address-repository";

export type PublicSearchResult = {
  code: string;
  type: "BUSINESS" | "PLACE";
  name: string;
  reference: string | null;
};

type SearchRow = {
  code: string;
  address_type: "BUSINESS" | "PLACE";
  name: string;
  reference: string | null;
};

function normalizeSearchQuery(raw: string): string | null {
  const query = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > 120) return null;
  return query;
}

/**
 * Foundation for the future Direcciones507 search button.
 * Initially supports public PLACE/BUSINESS discovery from PostgreSQL only.
 * It does not expose Residential records or private address fields.
 */
export async function searchPublicDirectory(
  sql: SqlExecutor,
  rawQuery: string,
  requestedLimit = 20,
): Promise<PublicSearchResult[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return [];
  const limit = Math.max(1, Math.min(50, Math.trunc(requestedLimit)));
  const pattern = `%${query}%`;

  const rows = await sql<SearchRow>`
    SELECT a.code, a.address_type, a.name, a.reference
    FROM ad507.addresses a
    JOIN ad507.plans p ON p.id = a.plan_id
    JOIN ad507.plan_capabilities pc
      ON pc.plan_id = p.id
     AND pc.capability = 'public_indexing'
     AND pc.value_json = 'true'::jsonb
    WHERE a.status = 'ACTIVE'
      AND a.address_type IN ('BUSINESS', 'PLACE')
      AND (a.name ILIKE ${pattern} OR COALESCE(a.reference, '') ILIKE ${pattern})
    ORDER BY
      CASE WHEN lower(a.name) = lower(${query}) THEN 0 ELSE 1 END,
      a.name ASC,
      a.code ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    code: row.code,
    type: row.address_type,
    name: row.name,
    reference: row.reference,
  }));
}
