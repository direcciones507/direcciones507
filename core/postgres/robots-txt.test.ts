import { describe, expect, test } from 'bun:test';
import { buildRobotsTxt } from './robots-txt';

describe('robots.txt generator', () => {
  test('requires HTTPS public base URL', () => {
    expect(buildRobotsTxt('http://direcciones507.com')).toBeNull();
    expect(buildRobotsTxt('not-a-url')).toBeNull();
  });

  test('advertises canonical automatic sitemap', () => {
    const robots = buildRobotsTxt('https://direcciones507.com/');
    expect(robots).toContain('Sitemap: https://direcciones507.com/sitemap.xml');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
  });

  test('keeps private surfaces out of crawler discovery', () => {
    const robots = buildRobotsTxt('https://direcciones507.com');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /internal');
    expect(robots).toContain('Disallow: /api/internal');
  });

  test('removes configured query and fragment', () => {
    const robots = buildRobotsTxt('https://direcciones507.com/?preview=1#test');
    expect(robots).not.toContain('preview=1');
    expect(robots).not.toContain('#test');
  });
});
