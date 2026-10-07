import { describe, expect, test } from 'bun:test';
import { handleAutomaticSitemap } from './sitemap-handler';
import type { SqlExecutor } from './public-address-repository';

const noQuery: SqlExecutor = async () => { throw new Error('query not expected'); };

describe('automatic sitemap handler', () => {
  test('disabled sitemap stays dark without database access', async () => {
    const response = await handleAutomaticSitemap({ sql: noQuery, env: {} });
    expect(response.status).toBe(404);
  });

  test('invalid public base URL fails closed', async () => {
    const sql: SqlExecutor = async () => [];
    const response = await handleAutomaticSitemap({
      sql,
      env: { AD507_AUTOMATIC_SITEMAP_ENABLED: 'true', AD507_PUBLIC_BASE_URL: 'http://direcciones507.com' },
    });
    expect(response.status).toBe(503);
    expect(response.body).toContain('INVALID_PUBLIC_BASE_URL');
  });

  test('enabled sitemap returns XML from active public source', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-PARQUE-A1B2C3', updated_at: '2026-10-05T12:00:00.000Z',
    }];
    const response = await handleAutomaticSitemap({
      sql,
      env: { AD507_AUTOMATIC_SITEMAP_ENABLED: 'true', AD507_PUBLIC_BASE_URL: 'https://direcciones507.com' },
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/xml; charset=utf-8');
    expect(response.body).toContain('AD507-PARQUE-A1B2C3');
  });
});
