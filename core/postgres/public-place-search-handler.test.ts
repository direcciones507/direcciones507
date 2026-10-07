import { describe, expect, test } from 'bun:test';
import { handlePublicPlaceSearch } from './public-place-search-handler';
import type { SqlExecutor } from './public-address-repository';

describe('public place search handler', () => {
  test('disabled search returns 404 without touching PostgreSQL', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    const response = await handlePublicPlaceSearch({ sql, query: 'parque', env: {} });
    expect(response).toEqual({ status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } });
  });

  test('enabled search returns public results', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-PARQUE-A1B2C3', name: 'Parque Central', reference: 'Centro',
      latitude: 8.1, longitude: -80.9,
    }];
    const response = await handlePublicPlaceSearch({
      sql, query: 'parque', env: { AD507_PUBLIC_PLACE_SEARCH_ENABLED: 'true' },
    });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  test('enabled search still fails closed for invalid query', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    const response = await handlePublicPlaceSearch({
      sql, query: 'x', env: { AD507_PUBLIC_PLACE_SEARCH_ENABLED: 'true' },
    });
    expect(response).toEqual({ status: 200, body: { ok: true, results: [] } });
  });
});
