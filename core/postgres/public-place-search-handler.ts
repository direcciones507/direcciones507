import { searchPublicPlaces } from './public-place-search-repository';
import type { SqlExecutor } from './public-address-repository';

export function publicPlaceSearchEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_PUBLIC_PLACE_SEARCH_ENABLED === 'true';
}

/**
 * Public search stays dark until explicitly enabled. Repository-level rules
 * still enforce ACTIVE-only PLACE results, so the feature flag is not the
 * sole publication boundary.
 */
export async function handlePublicPlaceSearch(input: {
  sql: SqlExecutor;
  query: string;
  limit?: number;
  env?: Record<string, string | undefined>;
}) {
  if (!publicPlaceSearchEnabled(input.env ?? process.env)) {
    return { status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } };
  }

  const results = await searchPublicPlaces(input.sql, input.query, input.limit);
  return { status: 200, body: { ok: true, results } };
}
