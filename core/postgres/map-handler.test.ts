import { describe, expect, test } from 'bun:test';
import { getInternalMapData } from './map-handler';
import type { SqlExecutor } from './public-address-repository';

const noQuery: SqlExecutor = async () => {
  throw new Error('database query was not expected');
};

describe('internal map access', () => {
  test('disabled map does not query the database', async () => {
    const result = await getInternalMapData({
      sql: noQuery,
      actor: { authenticated: true, roles: ['ADMIN'] },
      env: {},
    });
    expect(result.status).toBe(404);
  });

  test('anonymous visitor cannot access internal map', async () => {
    const result = await getInternalMapData({
      sql: noQuery,
      actor: { authenticated: false, roles: [] },
      env: { AD507_INTERNAL_MAP_ENABLED: 'true' },
    });
    expect(result.status).toBe(403);
  });

  test('ordinary client cannot access internal map', async () => {
    const result = await getInternalMapData({
      sql: noQuery,
      actor: { authenticated: true, roles: ['CLIENT'] },
      env: { AD507_INTERNAL_MAP_ENABLED: 'true' },
    });
    expect(result.status).toBe(403);
  });

  test('admin can receive map points when enabled', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-0001', address_type: 'PLACE', name: 'Parque Central',
      latitude: 8.1, longitude: -80.9, status: 'ACTIVE',
    }];
    const result = await getInternalMapData({
      sql,
      actor: { authenticated: true, roles: ['ADMIN'] },
      env: { AD507_INTERNAL_MAP_ENABLED: 'true' },
    });
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(1);
  });
});
