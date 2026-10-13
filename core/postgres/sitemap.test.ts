import { describe, expect, test } from "bun:test";
import { renderAutomaticSitemap } from "./sitemap";
import type { SqlExecutor } from "./public-address-repository";

const shouldNotQuery: SqlExecutor = async () => {
  throw new Error("SQL must not run while feature gate is disabled");
};

describe("automatic sitemap", () => {
  test("fails closed without querying PostgreSQL", async () => {
    const response = await renderAutomaticSitemap({
      sql: shouldNotQuery,
      origin: "https://direcciones507.com",
      env: {},
    });
    expect(response.status).toBe(404);
    expect(response.body).toBe("Not found");
  });

  test("renders eligible PostgreSQL rows as XML", async () => {
    const sql: SqlExecutor = async () => [
      { code: "AD507-0001", updated_at: "2026-10-05T12:00:00.000Z" },
      { code: "AD507-LUGAR_2", updated_at: new Date("2026-10-05T13:00:00.000Z") },
    ];
    const response = await renderAutomaticSitemap({
      sql,
      origin: "https://direcciones507.com",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
    });
    expect(response.status).toBe(200);
    expect(response.contentType).toBe("application/xml; charset=utf-8");
    expect(response.body).toContain("https://direcciones507.com/AD507-0001/");
    expect(response.body).toContain("https://direcciones507.com/AD507-LUGAR_2/");
    expect(response.body).toContain("<lastmod>2026-10-05T12:00:00.000Z</lastmod>");
  });

  test("rejects an unsafe sitemap origin", async () => {
    const sql: SqlExecutor = async () => [];
    const response = await renderAutomaticSitemap({
      sql,
      origin: "javascript:alert(1)",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
    });
    expect(response.status).toBe(500);
    expect(response.body).toBe("Internal error");
  });
});
