import { describe, expect, test } from 'bun:test';
import { mediaCountAllowed, validateRequestMedia } from '../panel-preparation';
import { createR2Storage, r2Settings, signedR2Put } from '../r2-storage';

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
    AD507_R2_CREDENTIAL_ROTATION_CONFIRMED: 'true',
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
  test('credentials alone never enable uploads before confirmed rotation', () => {
    for (const confirmation of [undefined, '', 'false', 'TRUE']) {
      expect(r2Settings({ ...env, AD507_R2_CREDENTIAL_ROTATION_CONFIRMED: confirmation })).toBeNull();
    }
    expect(r2Settings({ ...env, R2_BUCKET: 'another-private-bucket' })).toBeNull();
  });
  test('direct adapter construction cannot omit the rotation gate', () => {
    const settings = { accountId: 'a'.repeat(32), bucket: 'direcciones507-media', accessKeyId: 'test', secretAccessKey: 'test' };
    expect(() => createR2Storage(settings as any)).toThrow('R2_ROTATION_NOT_CONFIRMED');
    expect(() => createR2Storage({ ...settings, rotationConfirmed: true, bucket: 'other' })).toThrow('R2_ROTATION_NOT_CONFIRMED');
  });
});

describe('Server-side request media policy', () => {
  test('Lugar requires exactly one photo', () => {
    expect(validateRequestMedia('PLACE', 'PLACE', { logos: 0, placePhotos: 1, galleryPhotos: 0 })).toBe(true);
    expect(validateRequestMedia('PLACE', 'PLACE', { logos: 0, placePhotos: 0, galleryPhotos: 0 })).toBe(false);
    expect(validateRequestMedia('PLACE', 'PLACE', { logos: 0, placePhotos: 2, galleryPhotos: 0 })).toBe(false);
  });
  test('business requires one logo and restricts galleries by plan', () => {
    expect(validateRequestMedia('BUSINESS', 'BUSINESS_FREE', { logos: 1, placePhotos: 0, galleryPhotos: 0 })).toBe(true);
    expect(validateRequestMedia('BUSINESS', 'BUSINESS_FREE', { logos: 0, placePhotos: 0, galleryPhotos: 0 })).toBe(false);
    expect(validateRequestMedia('BUSINESS', 'BUSINESS_FREE', { logos: 1, placePhotos: 0, galleryPhotos: 1 })).toBe(false);
    expect(validateRequestMedia('BUSINESS', 'BUSINESS_PREMIUM_PRO', { logos: 1, placePhotos: 0, galleryPhotos: 5 })).toBe(true);
    expect(validateRequestMedia('BUSINESS', 'BUSINESS_PREMIUM_PRO', { logos: 1, placePhotos: 0, galleryPhotos: 6 })).toBe(false);
    expect(validateRequestMedia('BUSINESS', 'INVALID', { logos: 1, placePhotos: 0, galleryPhotos: 0 })).toBe(false);
  });
  test('residential has no uploaded media', () => {
    expect(validateRequestMedia('RESIDENTIAL', 'RESIDENTIAL', { logos: 0, placePhotos: 0, galleryPhotos: 0 })).toBe(true);
    expect(validateRequestMedia('RESIDENTIAL', 'RESIDENTIAL', { logos: 1, placePhotos: 0, galleryPhotos: 0 })).toBe(false);
  });
});

describe('Private R2 request signing', () => {
  const settings = { accountId: 'a'.repeat(32), bucket: 'direcciones507-media', accessKeyId: 'test-access', secretAccessKey: 'test-secret', rotationConfirmed: true as const };
  test('signs private uploads deterministically and never exposes credentials in URL', () => {
    const bytes = new TextEncoder().encode('test-content');
    const signed = signedR2Put(settings, 'addresses/123/logo/sample.png', bytes, 'image/png', new Date('2026-10-10T12:00:00.000Z'));
    const repeat = signedR2Put(settings, 'addresses/123/logo/sample.png', bytes, 'image/png', new Date('2026-10-10T12:00:00.000Z'));
    expect(signed).toEqual(repeat);
    expect(signed.url).toContain('/direcciones507-media/addresses/123/logo/sample.png');
    expect(signed.url).not.toContain('test-secret');
    expect(signed.headers.authorization).toContain('AWS4-HMAC-SHA256');
    expect(signed.headers.authorization).not.toContain('test-secret');
    expect(signed.headers['x-amz-content-sha256']).toHaveLength(64);
  });
  test('signature changes when payload changes', () => {
    const date = new Date('2026-10-10T12:00:00.000Z');
    const a = signedR2Put(settings, 'addresses/123/logo/sample.png', new Uint8Array([1]), 'image/png', date);
    const b = signedR2Put(settings, 'addresses/123/logo/sample.png', new Uint8Array([2]), 'image/png', date);
    expect(a.headers.authorization).not.toBe(b.headers.authorization);
  });
});

