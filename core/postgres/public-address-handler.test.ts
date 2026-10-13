import { describe, expect, test } from "bun:test";
import { handleGetPublicAddress } from "./public-address-handler";
import type { SqlExecutor } from "./public-address-repository";

const shouldNotQuery: SqlExecutor = async () => {
  throw new Error("SQL must not run while feature gate is disabled");
};

describe("GET public address handler safety", () => {
  test("disabled gate returns ROUTE_DENIED without touching PostgreSQL", async () => {
    const response = await handleGetPublicAddress({
      sql: shouldNotQuery,
      code: "AD507-0001",
      env: {},
      requestId: "req-test-1",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      ok: false,
      error: { code: "ROUTE_DENIED", message: "Route not available" },
      requestId: "req-test-1",
    });
  });

  test("database errors do not leak internals", async () => {
    const failingSql: SqlExecutor = async () => {
      throw new Error("postgres://secret-user:secret-password@host/db relation ad507.addresses");
    };

    const response = await handleGetPublicAddress({
      sql: failingSql,
      code: "AD507-0001",
      env: { AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" },
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Internal error" },
    });
    expect(JSON.stringify(response.body)).not.toContain("secret-password");
  });
});
