import { test, expect } from 'bun:test';
import { createNewAddressPublication } from '../new-address-publication';

const id = '123e4567-e89b-42d3-a456-426614174000';
const code = 'AD507-N' + id.replaceAll('-', '').toUpperCase();
const request = { id, type: 'BUSINESS', plan: 'FREE', name: 'Ejemplo', requestedName: '' };

test('new AD507 codes remain uppercase even when PLANES contains lowercase legacy codes', async () => {
  const sql = { unsafe: async () => [] } as any;
  const fetcher = (async () => Response.json({ ok: true, codes: [{ codigo: 'ad507-0001' }] })) as typeof fetch;
  const publisher = createNewAddressPublication(sql, { namespaceExclusive: true, fetch: fetcher });
  expect(await publisher.reserve(request)).toBe(code);
});

test('collision checks normalize lowercase historical codes before reserving', async () => {
  const sql = { unsafe: async () => [] } as any;
  const fetcher = (async () => Response.json({ ok: true, codes: [{ codigo: code.toLowerCase() }] })) as typeof fetch;
  const publisher = createNewAddressPublication(sql, { namespaceExclusive: true, fetch: fetcher });
  expect(publisher.reserve(request)).rejects.toThrow('CANONICAL_CODE_COLLISION');
});

test('reservation stays blocked until namespace exclusivity is confirmed', async () => {
  const publisher = createNewAddressPublication({} as any, { namespaceExclusive: false });
  expect(publisher.reserve(request)).rejects.toThrow('HISTORICAL_NAMESPACE_NOT_VERIFIED');
});
