function normalizePublicBaseUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Canonical robots.txt for the future Core. Search engines discover the
 * automatic sitemap here, while private/admin surfaces remain explicitly
 * disallowed. This does not expose or submit any private data to Google.
 */
export function buildRobotsTxt(publicBaseUrl: string): string | null {
  const base = normalizePublicBaseUrl(publicBaseUrl);
  if (!base) return null;

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /internal',
    'Disallow: /api/internal',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
}
