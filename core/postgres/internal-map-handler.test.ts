import { describe, expect, test } from 'bun:test';
import { handleInternalMap } from './internal-map-handler';
import type { SqlExecutor } from './public-address-repository';

const noQuery: SqlExecutor = async () => { throw new Error('query not expected'); };

describe('internal map handler', () => {
  test('disabled map stays dark without database access', async () => {
    const response = await handleInternalMap({
      sql: noQuery,
      actor: { authenticated: true, roles: ['ADMIN'] },
      env: {},
    });
    expect(response).toEqual({ status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } });
  });

  test('anonymous actor is denied without database access', async () => {
    const response = await handleInternalMap({
      sql: noQuery,
      actor: { authenticated: false, roles: [] },
      env: { AD507_INTERNAL_MAP_ENABLED: 'true' },
    });
    expect(response.status).toBe(403);
  });

  test('operator cannot view private map', async () => {
    const response = await handleInternalMap({
      sql: noQuery,
      actor: { authenticated: true, roles: ['OPERATOR'] },
      env: { AD507_INTERNAL_MAP_ENABLED: 'true' },
    });
    expect(response.status).toBe(403);
  });

  test('admin can retrieve verified internal points when enabled', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-PARQUE-A1B2C3', address_type: 'PLACE', name: 'Parque Central',
      latitude: 8.1, longitude: -80.9,
    }];
    const response = await handleInternalMap({
      sql,
      actor: { authenticated: true, roles: ['ADMIN'] },
      env: { AD507_INTERNAL_MAP_ENABLED: 'true' },
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, points: [{
      code: 'AD507-PARQUE-A1B2C3', type: 'PLACE', name: 'Parque Central',
      latitude: 8.1, longitude: -80.9,
    }] });
  });
});
