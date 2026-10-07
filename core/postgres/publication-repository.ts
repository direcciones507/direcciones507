import { normalizeAd507Code, type SqlExecutor } from "./public-address-repository";

export type PublicationMetadata = {
  code: string;
  canonicalPath: string;
  indexable: boolean;
  updatedAt: string;
};

type PublicationRow = {
  code: string;
  updated_at: string | Date;
  public_indexing: unknown;
};

/**
 * Returns publication metadata only for ACTIVE BUSINESS/PLACE records.
 * Residential and non-public lifecycle states intentionally resolve as null.
 * This query never calls Google/Search Console and never exposes private fields.
 */
export async function getPublicationMetadataByCode(
  sql: SqlExecutor,
  rawCode: string,
): Promise<PublicationMetadata | null> {
  const code = normalizeAd507Code(rawCode);
  if (!code) return null;

  const rows = await sql<PublicationRow>`
    SELECT
      a.code,
      a.updated_at,
      COALESCE(pc.value_json, 'false'::jsonb) AS public_indexing
    FROM ad507.addresses a
    LEFT JOIN ad507.plans p ON p.id = a.plan_id
    LEFT JOIN ad507.plan_capabilities pc
      ON pc.plan_id = p.id
     AND pc.capability = 'public_indexing'
    WHERE a.code = ${code}
      AND a.status = 'ACTIVE'
      AND a.address_type IN ('BUSINESS', 'PLACE')
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const updatedAt = row.updated_at instanceof Date
    ? row.updated_at.toISOString()
    : new Date(row.updated_at).toISOString();

  return {
    code: row.code,
    canonicalPath: `/${row.code}/`,
    indexable: row.public_indexing === true,
    updatedAt,
  };
}
