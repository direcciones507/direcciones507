import { postgresPublicReadEnabled, type SqlExecutor } from "./public-address-repository";
import { getPublicationMetadataByCode } from "./publication-repository";
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

/** Framework-neutral future handler for GET /v1/addresses/:code/publication. */
export async function handleGetPublicationMetadata(input: {
  sql: SqlExecutor;
  code: string;
  env?: Record<string, string | undefined>;
  requestId?: string;
}): Promise<CoreJsonResponse> {
  if (!postgresPublicReadEnabled(input.env ?? process.env)) {
    return error(404, "ROUTE_DENIED", "Route not available", input.requestId);
  }

  try {
    const publication = await getPublicationMetadataByCode(input.sql, input.code);
    if (!publication) {
      return error(404, "ADDRESS_NOT_FOUND", "Address not found", input.requestId);
    }
    return {
      status: 200,
      body: { ok: true, publication, ...(input.requestId ? { requestId: input.requestId } : {}) },
    };
  } catch {
    return error(500, "INTERNAL_ERROR", "Internal error", input.requestId);
  }
}
