import { describe, expect, test } from 'bun:test';
import { getPublicSitemapAddresses } from './public-sitemap-repository';
import type { SqlExecutor } from './public-address-repository';

describe('public sitemap source repository', () => {
  test('normalizes valid update timestamps', async () => {
    const sql: SqlExecutor = async () => [{
      code: 'AD507-PARQUE-A1B2C3', updated_at: '2026-10-05T12:00:00.000Z',
    }];
    expect(await getPublicSitemapAddresses(sql)).toEqual([{
      code: 'AD507-PARQUE-A1B2C3', updatedAt: '2026-10-05T12:00:00.000Z',
    }]);
  });

  test('drops malformed timestamps defensively', async () => {
    const sql: SqlExecutor = async () => [{ code: 'AD507-BAD', updated_at: 'not-a-date' }];
    expect(await getPublicSitemapAddresses(sql)).toEqual([]);
  });

  test('accepts a bounded sitemap request', async () => {
    let queried = false;
    const sql: SqlExecutor = async () => { queried = true; return []; };
    expect(await getPublicSitemapAddresses(sql, 999999)).toEqual([]);
    expect(queried).toBe(true);
  });
});
