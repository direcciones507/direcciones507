import { getInternalMapPoints } from './public-map-repository';
import type { SqlExecutor } from './public-address-repository';

export type InternalMapActor = { authenticated: boolean; roles: string[] };

export function internalMapEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_INTERNAL_MAP_ENABLED === 'true';
}

function canViewInternalMap(actor: InternalMapActor): boolean {
  return actor.authenticated && actor.roles.includes('ADMIN');
}

/**
 * The map dataset remains an internal ADMIN-only capability while Direcciones507
 * accumulates enough verified points. Public exposure must be implemented as a
 * separate, explicit feature later rather than reusing this private endpoint.
 */
export async function handleInternalMap(input: {
  sql: SqlExecutor;
  actor: InternalMapActor;
  limit?: number;
  env?: Record<string, string | undefined>;
}) {
  if (!internalMapEnabled(input.env ?? process.env)) {
    return { status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } };
  }
  if (!canViewInternalMap(input.actor)) {
    return { status: 403, body: { ok: false, code: 'ACCESS_DENIED' } };
  }

  const points = await getInternalMapPoints(input.sql, input.limit);
  return { status: 200, body: { ok: true, points } };
}
