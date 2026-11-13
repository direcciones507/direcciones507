import type { SqlExecutor } from './public-address-repository';

export type SitemapAddress = {
  code: string;
  updatedAt: string;
};

/**
 * Canonical source for future automatic sitemap/indexing feeds.
 * Only ACTIVE BUSINESS/PLACE records are eligible. Residential records and
 * unpublished moderation states are intentionally excluded at query level.
 */
export async function getPublicSitemapAddresses(
  sql: SqlExecutor,
  limit = 50000,
): Promise<SitemapAddress[]> {
  const safeLimit = Math.max(1, Math.min(50000, Math.trunc(limit)));
  const rows = await sql<{ code: string; updated_at: string | Date }>`
    SELECT code, updated_at
    FROM ad507.addresses
    WHERE status = 'ACTIVE'
      AND address_type IN ('BUSINESS', 'PLACE')
      AND (COALESCE(to_jsonb(addresses)->'request_data'->'annualService'->>'policy','') <> 'annual-manual-20261113' OR to_jsonb(addresses)->'request_data'->'migration' IS NOT NULL OR (COALESCE(to_jsonb(addresses)->'request_data'->'annualService'->>'paymentHold','false')<>'true' AND (to_jsonb(addresses)->'request_data'->'annualService'->>'endsAt')::timestamptz > now() AND (to_jsonb(addresses)->'request_data'->'annualService'->>'mode'<>'INSTALLMENTS' OR to_jsonb(addresses)->'request_data'->'annualService'->>'fullyPaid'='true')))

    ORDER BY code ASC
    LIMIT ${safeLimit}
  `;

  return rows.flatMap((row) => {
    const date = row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at);
    if (Number.isNaN(date.getTime())) return [];
    return [{ code: row.code, updatedAt: date.toISOString() }];
  });
}
