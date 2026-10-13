import { describe, expect, test } from 'bun:test';
import { hasRole, signSession, verifySession } from './auth';

describe('Core auth session', () => {
  test('accepts a valid signed session', async () => {
    const token = await signSession(
      { uid: '00000000-0000-0000-0000-000000000001', email: 'ventas@direcciones507.com', exp: Math.floor(Date.now() / 1000) + 60 },
      'test-secret',
    );
    const payload = await verifySession(token, 'test-secret');
    expect(payload?.email).toBe('ventas@direcciones507.com');
  });

  test('rejects tampered and expired sessions', async () => {
    const token = await signSession(
      { uid: '00000000-0000-0000-0000-000000000001', email: 'ventas@direcciones507.com', exp: Math.floor(Date.now() / 1000) - 1 },
      'test-secret',
    );
    expect(await verifySession(token, 'test-secret')).toBeNull();
    expect(await verifySession(token + 'x', 'test-secret')).toBeNull();
  });

  test('ADMIN is role-driven, not email-driven', () => {
    const base = { id: 'u1', email: 'ventas@direcciones507.com', displayName: null };
    expect(hasRole({ ...base, roles: [] }, 'ADMIN')).toBe(false);
    expect(hasRole({ ...base, roles: ['ADMIN'] }, 'ADMIN')).toBe(true);
  });
});
