import { describe, expect, test } from 'bun:test';
import { evaluateCoreReadiness } from './core-readiness';

describe('Core production readiness gate', () => {
  test('fails closed when required connection settings are absent', () => {
    const result = evaluateCoreReadiness({});
    expect(result.ready).toBe(false);
    expect(result.missing).toContain('DATABASE_URL');
    expect(result.missing).toContain('AD507_PUBLIC_BASE_URL');
    expect(result.missing).toContain('AD507_RESIDENTIAL_PROVISIONING_SECRET');
  });

  test('rejects a non-HTTPS public URL', () => {
    const result = evaluateCoreReadiness({
      DATABASE_URL: 'postgresql://private',
      AD507_PUBLIC_BASE_URL: 'http://direcciones507.com',
      AD507_RESIDENTIAL_PROVISIONING_SECRET: 'configured',
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain('AD507_PUBLIC_BASE_URL_HTTPS');
  });

  test('reports ready without exposing configured values', () => {
    const result = evaluateCoreReadiness({
      DATABASE_URL: 'postgresql://private-secret',
      AD507_PUBLIC_BASE_URL: 'https://direcciones507.com',
      AD507_RESIDENTIAL_PROVISIONING_SECRET: 'top-secret',
    });
    expect(result).toEqual({ ready: true, missing: [] });
    expect(JSON.stringify(result)).not.toContain('private-secret');
    expect(JSON.stringify(result)).not.toContain('top-secret');
  });
});
