import type { SqlExecutor } from "./public-address-repository";

export type SitemapEntry = {
  code: string;
  canonicalPath: string;
  lastModified: string;
};

type SitemapRow = {
  code: string;
  updated_at: string | Date;
};

/**
 * Lists only addresses eligible for public search discovery.
 * Residential and non-ACTIVE records are excluded at SQL level.
 */
export async function listSitemapEntries(
  sql: SqlExecutor,
  input: { limit?: number; afterCode?: string } = {},
): Promise<SitemapEntry[]> {
  const limit = Math.max(1, Math.min(1000, Math.trunc(input.limit ?? 500)));
  const afterCode = String(input.afterCode ?? "").trim().toUpperCase();

  const rows = await sql<SitemapRow>`
    SELECT a.code, a.updated_at
    FROM ad507.addresses a
    JOIN ad507.plans p ON p.id = a.plan_id
    JOIN ad507.plan_capabilities pc
      ON pc.plan_id = p.id
     AND pc.capability = 'public_indexing'
     AND pc.value_json = 'true'::jsonb
    WHERE a.status = 'ACTIVE'
      AND a.address_type IN ('BUSINESS', 'PLACE')
      AND (${afterCode} = '' OR a.code > ${afterCode})
    ORDER BY a.code ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    code: row.code,
    canonicalPath: `/${row.code}/`,
    lastModified: (row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at)).toISOString(),
  }));
}
