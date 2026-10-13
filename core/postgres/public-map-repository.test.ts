import { describe, expect, test } from 'bun:test';
import { getInternalMapPoints } from './public-map-repository';
import type { SqlExecutor } from './public-address-repository';

describe('internal map point repository', () => {
  test('normalizes valid stored coordinates', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-PARQUE-A1B2C3', address_type: 'PLACE', name: 'Parque Central',
      latitude: '8.1001', longitude: '-80.9001',
    }];
    expect(await getInternalMapPoints(sql)).toEqual([{
      code: 'AD507-PARQUE-A1B2C3', type: 'PLACE', name: 'Parque Central',
      latitude: 8.1001, longitude: -80.9001,
    }]);
  });

  test('drops malformed coordinates defensively', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-BAD', address_type: 'BUSINESS', name: 'Dato inválido',
      latitude: 'not-a-number', longitude: '-80.9',
    }];
    expect(await getInternalMapPoints(sql)).toEqual([]);
  });

  test('accepts bounded dataset request', async () => {
    let queried = false;
    const sql: SqlExecutor = async () => { queried = true; return []; };
    expect(await getInternalMapPoints(sql, 999999)).toEqual([]);
    expect(queried).toBe(true);
  });
});
