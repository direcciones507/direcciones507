import { postgresPublicReadEnabled, type SqlExecutor } from "./public-address-repository";

type CountRow = { eligible_count: string | number };

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export async function renderSitemapIndex(input: {
  sql: SqlExecutor;
  origin: string;
  env?: Record<string, string | undefined>;
  pageSize?: number;
}): Promise<{ status: number; contentType: string; body: string }> {
  if (!postgresPublicReadEnabled(input.env ?? process.env)) {
    return { status: 404, contentType: "text/plain; charset=utf-8", body: "Not found" };
  }

  let origin: URL;
  try {
    origin = new URL(input.origin);
    if (!['https:', 'http:'].includes(origin.protocol)) throw new Error("invalid protocol");
  } catch {
    return { status: 500, contentType: "text/plain; charset=utf-8", body: "Internal error" };
  }

  const pageSize = Math.max(1, Math.min(50000, Math.trunc(input.pageSize ?? 10000)));
  try {
    const rows = await input.sql<CountRow>`
      SELECT count(*) AS eligible_count
      FROM ad507.addresses a
      JOIN ad507.plans p ON p.id = a.plan_id
      JOIN ad507.plan_capabilities pc
        ON pc.plan_id = p.id
       AND pc.capability = 'public_indexing'
       AND pc.value_json = 'true'::jsonb
      WHERE a.status = 'ACTIVE'
        AND a.address_type IN ('BUSINESS', 'PLACE')
    `;
    const count = Math.max(0, Number(rows[0]?.eligible_count ?? 0));
    const pages = Math.ceil(count / pageSize);
    const nodes: string[] = [];
    for (let page = 1; page <= pages; page += 1) {
      const loc = new URL(`/sitemaps/addresses-${page}.xml`, origin).toString();
      nodes.push(`  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`);
    }
    return {
      status: 200,
      contentType: "application/xml; charset=utf-8",
      body: `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${nodes.join("\n")}\n</sitemapindex>\n`,
    };
  } catch {
    return { status: 500, contentType: "text/plain; charset=utf-8", body: "Internal error" };
  }
}
