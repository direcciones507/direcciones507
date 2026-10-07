import { describe, expect, test } from 'bun:test';
import { moderatePlace } from './place-moderation-repository';
import type { SqlExecutor } from './public-address-repository';

describe('place moderation persistence', () => {
  test('invalid transition never touches PostgreSQL', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    const result = await moderatePlace(sql, {
      code: 'AD507-PARQUE-A1B2C3', currentStatus: 'DRAFT', action: 'APPROVE',
    });
    expect(result).toEqual({ ok: false, code: 'INVALID_TRANSITION' });
  });

  test('successful transition returns persisted state', async () => {
    const sql: SqlExecutor = async () => [{ code: 'AD507-PARQUE-A1B2C3', status: 'PENDING_REVIEW' }];
    const result = await moderatePlace(sql, {
      code: 'AD507-PARQUE-A1B2C3', currentStatus: 'DRAFT', action: 'SUBMIT_FOR_REVIEW',
    });
    expect(result).toEqual({ ok: true, code: 'AD507-PARQUE-A1B2C3', status: 'PENDING_REVIEW' });
  });

  test('stale state fails closed', async () => {
    const sql: SqlExecutor = async () => [];
    const result = await moderatePlace(sql, {
      code: 'AD507-PARQUE-A1B2C3', currentStatus: 'PENDING_REVIEW', action: 'APPROVE',
    });
    expect(result).toEqual({ ok: false, code: 'STALE_STATE' });
  });

  test('database error is contained', async () => {
    const sql: SqlExecutor = async () => { throw new Error('db unavailable'); };
    const result = await moderatePlace(sql, {
      code: 'AD507-PARQUE-A1B2C3', currentStatus: 'ACTIVE', action: 'SUSPEND',
    });
    expect(result).toEqual({ ok: false, code: 'UPDATE_FAILED' });
  });
});
