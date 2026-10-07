import { describe, expect, test } from 'bun:test';
import { createPlaceDraft } from './place-create-repository';
import type { SqlExecutor } from './public-address-repository';

const validInput = {
  name: 'Parque Central',
  reference: 'Frente a la iglesia',
  latitude: 8.1,
  longitude: -80.9,
};

describe('place draft creation repository', () => {
  test('invalid payload never touches PostgreSQL', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    const result = await createPlaceDraft(sql, { ...validInput, latitude: 100 });
    expect(result).toEqual({ ok: false, code: 'INVALID_REQUEST', field: 'latitude' });
  });

  test('creates only a DRAFT place', async () => {
    const sql: SqlExecutor = async () => [{ code: 'AD507-PARQUE-CENTRAL-A1B2C3', status: 'DRAFT' }];
    const result = await createPlaceDraft(sql, validInput, { entropy: () => 'a1b2c3' });
    expect(result).toEqual({
      ok: true,
      place: { code: 'AD507-PARQUE-CENTRAL-A1B2C3', status: 'DRAFT' },
    });
  });

  test('retries a unique-code collision and succeeds', async () => {
    let calls = 0;
    const sql: SqlExecutor = async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('duplicate key'), { code: '23505' });
      return [{ code: 'AD507-PARQUE-CENTRAL-B2C3D4', status: 'DRAFT' }];
    };
    const entropyValues = ['a1b2c3', 'b2c3d4'];
    const result = await createPlaceDraft(sql, validInput, {
      attempts: 3,
      entropy: () => entropyValues.shift() ?? 'ffffff',
    });
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
  });

  test('stops after bounded collision attempts', async () => {
    let calls = 0;
    const sql: SqlExecutor = async () => {
      calls += 1;
      throw Object.assign(new Error('duplicate key'), { code: '23505' });
    };
    const result = await createPlaceDraft(sql, validInput, { attempts: 2, entropy: () => 'a1b2c3' });
    expect(calls).toBe(2);
    expect(result).toEqual({ ok: false, code: 'CODE_COLLISION' });
  });
});
