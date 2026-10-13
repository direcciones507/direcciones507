import { describe, expect, test } from 'bun:test';
import { buildAddressSitemapXml } from './sitemap-xml';

describe('address sitemap XML', () => {
  test('requires an HTTPS public base URL', () => {
    expect(buildAddressSitemapXml([], 'http://direcciones507.com')).toBeNull();
    expect(buildAddressSitemapXml([], 'not-a-url')).toBeNull();
  });

  test('builds canonical address URLs and lastmod', () => {
    const xml = buildAddressSitemapXml([
      { code: 'AD507-PARQUE-A1B2C3', updatedAt: '2026-10-05T12:00:00.000Z' },
    ], 'https://direcciones507.com/');
    expect(xml).toContain('<loc>https://direcciones507.com/AD507-PARQUE-A1B2C3</loc>');
    expect(xml).toContain('<lastmod>2026-10-05T12:00:00.000Z</lastmod>');
  });

  test('removes query and fragment from configured base URL', () => {
    const xml = buildAddressSitemapXml([], 'https://direcciones507.com/?preview=1#x');
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('preview=1');
    expect(xml).not.toContain('#x');
  });

  test('escapes XML-sensitive content', () => {
    const xml = buildAddressSitemapXml([
      { code: 'AD507-A&B', updatedAt: '2026-10-05T12:00:00.000Z' },
    ], 'https://direcciones507.com');
    expect(xml).toContain('AD507-A%26B');
    expect(xml).not.toContain('AD507-A&B</loc>');
  });
});
