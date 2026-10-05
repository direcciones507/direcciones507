import { describe, expect, test } from "bun:test";
import { handlePublicDirectorySearch } from "./search-handler";
import type { SqlExecutor } from "./public-address-repository";

const shouldNotQuery: SqlExecutor = async () => {
  throw new Error("SQL must not run while feature gate is disabled");
};

describe("public directory search handler", () => {
  test("fails closed without touching PostgreSQL", async () => {
    const response = await handlePublicDirectorySearch({
      sql: shouldNotQuery,
      query: "parque",
      env: {},
      requestId: "req-search-1",
    });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      ok: false,
      error: { code: "ROUTE_DENIED", message: "Route not available" },
      requestId: "req-search-1",
    });
  });

  test("returns an empty result set for too-short searches without querying", async () => {
    const response = await handlePublicDirectorySearch({
      sql: shouldNotQuery,
      query: "a",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, results: [], count: 0 });
  });

  test("does not leak database details on failure", async () => {
    const failingSql: SqlExecutor = async () => {
      throw new Error("DATABASE_URL=postgres://secret:password@private-host/db");
    };
    const response = await handlePublicDirectorySearch({
      sql: failingSql,
      query: "restaurante",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
    });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Internal error" },
    });
    expect(JSON.stringify(response.body)).not.toContain("password");
  });
});
