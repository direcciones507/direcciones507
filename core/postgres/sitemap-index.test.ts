import { describe, expect, test } from "bun:test";
import { renderSitemapIndex } from "./sitemap-index";
import type { SqlExecutor } from "./public-address-repository";

const shouldNotQuery: SqlExecutor = async () => {
  throw new Error("SQL must not run while feature gate is disabled");
};

describe("sitemap index", () => {
  test("fails closed without touching PostgreSQL", async () => {
    const response = await renderSitemapIndex({
      sql: shouldNotQuery,
      origin: "https://direcciones507.com",
      env: {},
    });
    expect(response.status).toBe(404);
    expect(response.body).toBe("Not found");
  });

  test("creates enough sitemap pages for eligible addresses", async () => {
    const sql: SqlExecutor = async () => [{ eligible_count: 25001 }];
    const response = await renderSitemapIndex({
      sql,
      origin: "https://direcciones507.com",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
      pageSize: 10000,
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain("/sitemaps/addresses-1.xml");
    expect(response.body).toContain("/sitemaps/addresses-2.xml");
    expect(response.body).toContain("/sitemaps/addresses-3.xml");
    expect(response.body).not.toContain("/sitemaps/addresses-4.xml");
  });

  test("empty catalog produces a valid empty index", async () => {
    const sql: SqlExecutor = async () => [{ eligible_count: 0 }];
    const response = await renderSitemapIndex({
      sql,
      origin: "https://direcciones507.com",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain("<sitemapindex");
    expect(response.body).not.toContain("<sitemap>");
  });
});
