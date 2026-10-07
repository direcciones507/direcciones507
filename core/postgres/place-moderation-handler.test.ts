import { describe, expect, test } from 'bun:test';
import { handleModeratePlace } from './place-moderation-handler';
import type { SqlExecutor } from './public-address-repository';

const noQuery: SqlExecutor = async () => { throw new Error('query not expected'); };

const base = {
  code: 'AD507-PARQUE-A1B2C3',
  currentStatus: 'PENDING_REVIEW' as const,
  action: 'APPROVE' as const,
};

describe('place moderation handler', () => {
  test('disabled moderation fails closed', async () => {
    const response = await handleModeratePlace({
      sql: noQuery, actor: { authenticated: true, roles: ['ADMIN'] }, ...base, env: {},
    });
    expect(response.status).toBe(404);
  });

  test('anonymous actor is denied', async () => {
    const response = await handleModeratePlace({
      sql: noQuery, actor: { authenticated: false, roles: [] }, ...base,
      env: { AD507_PLACE_MODERATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(403);
  });

  test('operator cannot publish', async () => {
    const response = await handleModeratePlace({
      sql: noQuery, actor: { authenticated: true, roles: ['OPERATOR'] }, ...base,
      env: { AD507_PLACE_MODERATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(403);
  });

  test('admin can approve reviewed place', async () => {
    const sql: SqlExecutor = async () => [{ code: base.code, status: 'ACTIVE' }];
    const response = await handleModeratePlace({
      sql, actor: { authenticated: true, roles: ['ADMIN'] }, ...base,
      env: { AD507_PLACE_MODERATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, code: base.code, status: 'ACTIVE' });
  });

  test('stale state becomes conflict instead of overwrite', async () => {
    const sql: SqlExecutor = async () => [];
    const response = await handleModeratePlace({
      sql, actor: { authenticated: true, roles: ['ADMIN'] }, ...base,
      env: { AD507_PLACE_MODERATION_ENABLED: 'true' },
    });
    expect(response.status).toBe(409);
  });
});
