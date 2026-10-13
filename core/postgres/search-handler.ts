import { postgresPublicReadEnabled, type SqlExecutor } from "./public-address-repository";
import { searchPublicDirectory } from "./search-repository";
import type { CoreJsonResponse } from "./public-address-handler";

function error(status: number, code: string, message: string, requestId?: string): CoreJsonResponse {
  return {
    status,
    body: {
      ok: false,
      error: { code, message },
      ...(requestId ? { requestId } : {}),
    },
  };
}

/** Future framework-neutral handler for GET /v1/search?q=... */
export async function handlePublicDirectorySearch(input: {
  sql: SqlExecutor;
  query: string;
  limit?: number;
  env?: Record<string, string | undefined>;
  requestId?: string;
}): Promise<CoreJsonResponse> {
  if (!postgresPublicReadEnabled(input.env ?? process.env)) {
    return error(404, "ROUTE_DENIED", "Route not available", input.requestId);
  }

  try {
    const results = await searchPublicDirectory(input.sql, input.query, input.limit ?? 20);
    return {
      status: 200,
      body: {
        ok: true,
        results,
        count: results.length,
        ...(input.requestId ? { requestId: input.requestId } : {}),
      },
    };
  } catch {
    return error(500, "INTERNAL_ERROR", "Internal error", input.requestId);
  }
}
