import {
  getPublicAddressByCode,
  postgresPublicReadEnabled,
  type SqlExecutor,
} from "./public-address-repository";

export type CoreJsonResponse = {
  status: number;
  body: Record<string, unknown>;
};

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

/**
 * Framework-neutral handler for GET /v1/addresses/:code.
 *
 * It is intentionally not wired into the production Railway Function yet.
 * The caller supplies the SQL executor and environment, which keeps this unit
 * testable and prevents accidental production activation from repository code.
 */
export async function handleGetPublicAddress(input: {
  sql: SqlExecutor;
  code: string;
  env?: Record<string, string | undefined>;
  requestId?: string;
}): Promise<CoreJsonResponse> {
  if (!postgresPublicReadEnabled(input.env ?? process.env)) {
    return error(404, "ROUTE_DENIED", "Route not available", input.requestId);
  }

  try {
    const address = await getPublicAddressByCode(input.sql, input.code);
    if (!address) {
      return error(404, "ADDRESS_NOT_FOUND", "Address not found", input.requestId);
    }

    return {
      status: 200,
      body: {
        ok: true,
        address,
        ...(input.requestId ? { requestId: input.requestId } : {}),
      },
    };
  } catch {
    // Never expose SQL/schema/credential details to public callers.
    return error(500, "INTERNAL_ERROR", "Internal error", input.requestId);
  }
}
