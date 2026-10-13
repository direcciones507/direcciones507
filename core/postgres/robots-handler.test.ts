import { describe, expect, test } from 'bun:test';
import { handleAutomaticRobots } from './robots-handler';

describe('automatic robots handler', () => {
  test('disabled robots stays dark', () => {
    const response = handleAutomaticRobots({});
    expect(response.status).toBe(404);
    expect(response.body).toContain('NOT_AVAILABLE');
  });

  test('invalid public base URL fails closed', () => {
    const response = handleAutomaticRobots({
      AD507_AUTOMATIC_ROBOTS_ENABLED: 'true',
      AD507_PUBLIC_BASE_URL: 'http://direcciones507.com',
    });
    expect(response.status).toBe(503);
    expect(response.body).toContain('INVALID_PUBLIC_BASE_URL');
  });

  test('enabled robots advertises sitemap and protects internal routes', () => {
    const response = handleAutomaticRobots({
      AD507_AUTOMATIC_ROBOTS_ENABLED: 'true',
      AD507_PUBLIC_BASE_URL: 'https://direcciones507.com',
    });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(response.body).toContain('Sitemap: https://direcciones507.com/sitemap.xml');
    expect(response.body).toContain('Disallow: /admin');
    expect(response.body).toContain('Disallow: /internal');
  });
});
