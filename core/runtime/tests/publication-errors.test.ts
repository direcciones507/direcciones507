import { test, expect } from 'bun:test';
import { handleRequestRoutes } from '../request-routes';
import { requireConfirmedPayment } from '../payment-repository';
import { readFileSync } from 'node:fs';

test('release gate rejects publication until activation', async () => {
  const req = new Request('https://direcciones507.com/v1/admin/requests/123e4567-e89b-42d3-a456-426614174000/publish', {method:'POST'});
  const response = await handleRequestRoutes(req, {enabled:false} as any);
  expect(response?.status).toBe(503);
});

test('request origin supports Railway TLS termination without trusting forwarded hosts', async () => {
  let authReads=0;
  const context={enabled:true,auth:{currentUser:async()=>{authReads++;return null;}}} as any;
  const probe=(origin:string,headers:Record<string,string>={})=>handleRequestRoutes(new Request('http://direcciones.lat/v1/user/requests',{method:'POST',headers:{origin,...headers}}),context);
  expect((await probe('https://direcciones.lat',{'x-forwarded-proto':'https'}))?.status).toBe(401);
  expect(authReads).toBe(1);
  expect((await probe('https://direcciones.lat'))?.status).toBe(403);
  expect((await probe('https://evil.example',{'x-forwarded-proto':'https','x-forwarded-host':'evil.example'}))?.status).toBe(403);
  expect((await probe('https://direcciones.lat',{'x-forwarded-proto':'https','sec-fetch-site':'cross-site'}))?.status).toBe(403);
  expect((await probe('http://direcciones.lat',{'x-forwarded-proto':'https'}))?.status).toBe(403);
  expect(authReads).toBe(1);
});

test('production publication checks payment even while providers are disabled', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  expect(server).toContain("paymentEnvironment:'production' }");
  expect(server).not.toContain("YAPPY_PAYMENTS_ENABLED ? {paymentEnvironment:");
});

test('free publication requires no payment query; paid plans cannot bypass payment', async () => {
  let reads = 0;
  const db = { unsafe: async () => { reads++; return []; } };
  await requireConfirmedPayment(db, { address_type:'BUSINESS', request_data:{plan:'BUSINESS_FREE'} }, 'production');
  expect(reads).toBe(0);
  for (const plan of ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']) {
    await expect(requireConfirmedPayment(db, { id:crypto.randomUUID(), address_type:'BUSINESS', request_data:{plan} }, 'production')).rejects.toThrow('PAYMENT_CONFIRMATION_REQUIRED');
  }
  expect(reads).toBe(2);
});
