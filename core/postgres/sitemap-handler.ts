import { getPublicSitemapAddresses } from './public-sitemap-repository';
import { buildAddressSitemapXml } from './sitemap-xml';
import type { SqlExecutor } from './public-address-repository';

export function automaticSitemapEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_AUTOMATIC_SITEMAP_ENABLED === 'true';
}

/**
 * Future /sitemap.xml handler. It remains dark until explicitly enabled and
 * derives its contents only from the ACTIVE public sitemap repository.
 */
export async function handleAutomaticSitemap(input: {
  sql: SqlExecutor;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? process.env;
  if (!automaticSitemapEnabled(env)) {
    return { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ok: false, code: 'NOT_AVAILABLE' }) };
  }

  const publicBaseUrl = env.AD507_PUBLIC_BASE_URL ?? '';
  const addresses = await getPublicSitemapAddresses(input.sql);
  const xml = buildAddressSitemapXml(addresses, publicBaseUrl);
  if (!xml) {
    return { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ok: false, code: 'INVALID_PUBLIC_BASE_URL' }) };
  }

  return {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=900',
    },
    body: xml,
  };
}
