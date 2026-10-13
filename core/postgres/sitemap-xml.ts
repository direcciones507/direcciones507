import type { SitemapAddress } from './public-sitemap-repository';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

/** Generates the future automatic sitemap without any Google API dependency. */
export function buildAddressSitemapXml(addresses: SitemapAddress[], publicBaseUrl: string): string | null {
  const base = normalizePublicBaseUrl(publicBaseUrl);
  if (!base) return null;

  const urls = addresses.map((address) => {
    const loc = `${base}/${encodeURIComponent(address.code)}`;
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(address.updatedAt)}</lastmod>\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
