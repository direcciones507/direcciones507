import { describe, expect, test } from 'bun:test';
import { handleCreatePlaceDraft } from './place-create-handler';
import type { SqlExecutor } from './public-address-repository';

const payload = {
  name: 'Parque Central',
  reference: 'Frente a la iglesia',
  latitude: 8.1,
  longitude: -80.9,
};

const noQuery: SqlExecutor = async () => {
  throw new Error('database query was not expected');
};

describe('protected add-place handler', () => {
  test('feature disabled fails closed without querying', async () => {
    const response = await handleCreatePlaceDraft({
      sql: noQuery,
      actor: { authenticated: true, roles: ['ADMIN'] },
      payload,
      env: {},
    });
    expect(response.status).toBe(404);
  });

  test('anonymous user is denied without querying', async () => {
    const response = await handleCreatePlaceDraft({
      sql: noQuery,
      actor: { authenticated: false, roles: [] },
      payload,
      env: { AD507_PLACE_CREATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(403);
  });

  test('ordinary client is denied without querying', async () => {
    const response = await handleCreatePlaceDraft({
      sql: noQuery,
      actor: { authenticated: true, roles: ['CLIENT'] },
      payload,
      env: { AD507_PLACE_CREATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(403);
  });

  test('admin can create a draft when explicitly enabled', async () => {
    const sql: SqlExecutor = async () => [{ code: 'AD507-PARQUE-CENTRAL-A1B2C3', status: 'DRAFT' }];
    const response = await handleCreatePlaceDraft({
      sql,
      actor: { authenticated: true, roles: ['ADMIN'] },
      payload,
      env: { AD507_PLACE_CREATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });
});
