import { createHash } from 'node:crypto';
import { test, expect } from 'bun:test';
import { createNewAddressPublication } from '../new-address-publication';

const id = '123e4567-e89b-42d3-a456-426614174000';
const code = 'AD507-N' + (BigInt('0x' + createHash('sha256').update(id).digest('hex')) % 100000000n).toString().padStart(8, '0');
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
  expect(publisher.historicalRegistryVerified).toBe(false);
  expect(publisher.reserve(request)).rejects.toThrow('HISTORICAL_NAMESPACE_NOT_VERIFIED');
});

test('malformed UUIDs cannot shorten or alias the reserved suffix', async () => {
  let contacted = false;
  const publisher = createNewAddressPublication({} as any, { namespaceExclusive: true,
    fetch: (async () => { contacted = true; throw Error('UNEXPECTED_FETCH'); }) as typeof fetch });
  for (const invalid of ['-'.repeat(36), 'a'.repeat(36),
    '123e4567e-89b-42d3-a456-426614174000']) {
    await expect(publisher.reserve({ ...request, id: invalid })).rejects.toThrow('INVALID_REQUEST');
  }
  expect(contacted).toBe(false);
});

test('distinct canonical UUIDs produce eight-digit numeric codes', async () => {
  const publisher = createNewAddressPublication({ unsafe: async () => [] } as any,
    { namespaceExclusive: true, fetch: (async () => Response.json({ok:true,codes:[{codigo:'AD507-0001'}]})) as typeof fetch });
  const first = await publisher.reserve(request);
  const second = await publisher.reserve({...request,id:'123e4567-e89b-42d3-a456-426614174001'});
  expect(first).toMatch(/^AD507-N[0-9]{8}$/);
  expect(second).toMatch(/^AD507-N[0-9]{8}$/);
  expect(first).not.toBe(second);
});

test('existing PLACE emitter cannot enter the new N8 namespace (source contract only)',async()=>{
 const {generatePlaceCodeCandidate}=await import('../../postgres/place-code');
 for(const name of ['N'+'A'.repeat(32),'','AD507-N'+id.replaceAll('-',''),'Parque Central']){
  for(const entropy of ['abcdef','','0'.repeat(32)]){
   const candidate=generatePlaceCodeCandidate(name,entropy);
   expect(candidate).not.toMatch(/^AD507-N[0-9]{8}$/);
   expect(candidate).toMatch(/^AD507-[A-Z0-9-]+-[A-F0-9]{1,6}$/);
  }
 }
});
