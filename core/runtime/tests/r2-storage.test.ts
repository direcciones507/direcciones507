import { describe, expect, test } from 'bun:test';
import { mediaCountAllowed } from '../panel-preparation';
import { r2Settings } from '../r2-storage';

describe('Gallery limits (logo and cover are separate)', () => {
  test('Lugar uses its cover field, not gallery', () => {
    expect(mediaCountAllowed('PLACE', 'PLACE', 0)).toBe(true);
    expect(mediaCountAllowed('PLACE', 'PLACE', 1)).toBe(false);
  });
  test('Negocio Gratis and Premium have no gallery', () => {
    for (const plan of ['BUSINESS_FREE', 'BUSINESS_PREMIUM']) {
      expect(mediaCountAllowed('BUSINESS', plan, 0)).toBe(true);
      expect(mediaCountAllowed('BUSINESS', plan, 1)).toBe(false);
    }
  });
  test('Premium Pro permits up to five gallery photos', () => {
    expect(mediaCountAllowed('BUSINESS', 'BUSINESS_PREMIUM_PRO', 0)).toBe(true);
    expect(mediaCountAllowed('BUSINESS', 'BUSINESS_PREMIUM_PRO', 5)).toBe(true);
    expect(mediaCountAllowed('BUSINESS', 'BUSINESS_PREMIUM_PRO', 6)).toBe(false);
  });
  test('Residential has no gallery', () => {
    expect(mediaCountAllowed('RESIDENTIAL', 'RESIDENTIAL', 0)).toBe(true);
    expect(mediaCountAllowed('RESIDENTIAL', 'RESIDENTIAL', 1)).toBe(false);
  });
});

describe('R2 configuration', () => {
  const env = {
    R2_ACCOUNT_ID: 'a'.repeat(32),
    R2_BUCKET: 'direcciones507-media',
    R2_ACCESS_KEY_ID: 'fake-access-key',
    R2_SECRET_ACCESS_KEY: 'fake-secret',
  };
  test('accepts valid complete configuration', () => {
    expect(r2Settings(env)?.bucket).toBe('direcciones507-media');
  });
  test('fails closed if credentials or account ID are missing', () => {
    expect(r2Settings({ ...env, R2_SECRET_ACCESS_KEY: '' })).toBeNull();
    expect(r2Settings({ ...env, R2_ACCOUNT_ID: 'not-an-account-id' })).toBeNull();
  });
});
