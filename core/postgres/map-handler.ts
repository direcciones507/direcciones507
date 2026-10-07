import { internalMapEnabled, canAccessInternalMap, type InternalMapActor } from './map-access';
import { listInternalMapPoints } from './map-repository';
import type { SqlExecutor } from './public-address-repository';

export async function getInternalMapData(input: {
  sql: SqlExecutor;
  actor: InternalMapActor;
  env?: Record<string, string | undefined>;
  limit?: number;
}) {
  if (!internalMapEnabled(input.env ?? process.env)) {
    return { status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } };
  }
  if (!canAccessInternalMap(input.actor)) {
    return { status: 403, body: { ok: false, code: 'ACCESS_DENIED' } };
  }
  try {
    const points = await listInternalMapPoints(input.sql, { limit: input.limit });
    return { status: 200, body: { ok: true, points, count: points.length } };
  } catch {
    return { status: 500, body: { ok: false, code: 'INTERNAL_ERROR' } };
  }
}
