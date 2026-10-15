import { test, expect } from 'bun:test';
import { handleRequestRoutes } from '../request-routes';
import { requireConfirmedPayment } from '../payment-repository';
import { readFileSync } from 'node:fs';

test('release gate rejects publication until activation', async () => {
  const req = new Request('https://direcciones507.com/v1/admin/requests/123e4567-e89b-42d3-a456-426614174000/publish', {method:'POST'});
  const response = await handleRequestRoutes(req, {enabled:false} as any);
  expect(response?.status).toBe(503);
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
