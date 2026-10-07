import { describe, expect, test } from 'bun:test';
import { getPublicAddressByCode, type SqlExecutor } from './public-address-repository';

function executorWithLandline(landline: string | null): SqlExecutor {
  let call = 0;
  return async () => {
    call += 1;
    if (call === 1) {
      return [{
        code: 'AD507-TEST', address_type: 'PLACE', name: 'Lugar de prueba', reference: null,
        description: null, commercial_description: null, latitude: 8.1, longitude: -80.9,
        phone: null, landline_phone: landline, hours: null, plan_code: null, plan_name: null,
      }];
    }
    if (call === 2) return [];
    return [];
  };
}

describe('public address optional landline', () => {
  test('returns landline independently when present', async () => {
    const result = await getPublicAddressByCode(executorWithLandline('998-1234'), 'AD507-TEST');
    expect(result?.phone).toBeNull();
    expect(result?.landlinePhone).toBe('998-1234');
  });

  test('keeps landline null when absent', async () => {
    const result = await getPublicAddressByCode(executorWithLandline(null), 'AD507-TEST');
    expect(result?.landlinePhone).toBeNull();
  });

  test('invalid code fails closed before database access', async () => {
    const sql: SqlExecutor = async () => { throw new Error('query not expected'); };
    expect(await getPublicAddressByCode(sql, '../secret')).toBeNull();
  });
});
