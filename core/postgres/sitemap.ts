import { postgresPublicReadEnabled, type SqlExecutor } from "./public-address-repository";
import { listSitemapEntries } from "./sitemap-repository";

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function renderAutomaticSitemap(input: {
  sql: SqlExecutor;
  origin: string;
  env?: Record<string, string | undefined>;
  limit?: number;
  afterCode?: string;
}): Promise<{ status: number; contentType: string; body: string }> {
  if (!postgresPublicReadEnabled(input.env ?? process.env)) {
    return { status: 404, contentType: "text/plain; charset=utf-8", body: "Not found" };
  }

  let origin: URL;
  try {
    origin = new URL(input.origin);
    if (origin.protocol !== "https:" && origin.protocol !== "http:") throw new Error("invalid protocol");
  } catch {
    return { status: 500, contentType: "text/plain; charset=utf-8", body: "Internal error" };
  }

  try {
    const entries = await listSitemapEntries(input.sql, {
      limit: input.limit,
      afterCode: input.afterCode,
    });

    const urls = entries.map((entry) => {
      const loc = new URL(entry.canonicalPath, origin).toString();
      return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${xmlEscape(entry.lastModified)}</lastmod>\n  </url>`;
    });

    return {
      status: 200,
      contentType: "application/xml; charset=utf-8",
      body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    };
  } catch {
    return { status: 500, contentType: "text/plain; charset=utf-8", body: "Internal error" };
  }
}
