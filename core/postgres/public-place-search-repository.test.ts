import { describe, expect, test } from 'bun:test';
import { searchPublicPlaces } from './public-place-search-repository';
import type { SqlExecutor } from './public-address-repository';

describe('public place search repository', () => {
  test('invalid short term fails closed without querying', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    expect(await searchPublicPlaces(sql, 'a')).toEqual([]);
  });

  test('normalizes public result coordinates', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-PARQUE-A1B2C3', name: 'Parque Central', reference: 'Centro',
      latitude: '8.1001', longitude: '-80.9001',
    }];
    expect(await searchPublicPlaces(sql, '  parque   central  ')).toEqual([{
      code: 'AD507-PARQUE-A1B2C3', name: 'Parque Central', reference: 'Centro',
      latitude: 8.1001, longitude: -80.9001,
    }]);
  });

  test('accepts a bounded caller limit', async () => {
    let queried = false;
    const sql: SqlExecutor = async () => {
      queried = true;
      return [];
    };
    expect(await searchPublicPlaces(sql, 'parque', 500)).toEqual([]);
    expect(queried).toBe(true);
  });

  test('overlong term fails closed before database access', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    expect(await searchPublicPlaces(sql, 'x'.repeat(81))).toEqual([]);
  });
});
