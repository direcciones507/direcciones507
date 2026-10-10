import { createPlaceDraft } from './place-create-repository';
import type { PlaceDraftInput } from './place-draft';
import type { SqlExecutor } from './public-address-repository';

export type PlaceCreateActor = { authenticated: boolean; roles: string[] };

export function placeCreationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_PLACE_CREATION_ENABLED === 'true';
}

function canCreatePlace(actor: PlaceCreateActor): boolean {
  return actor.authenticated && (actor.roles.includes('ADMIN') || actor.roles.includes('OPERATOR'));
}

/** Internal foundation for Add place. Public submissions will use a separate moderated boundary later. */
export async function handleCreatePlaceDraft(input: {
  sql: SqlExecutor;
  actor: PlaceCreateActor;
  payload: PlaceDraftInput;
  env?: Record<string, string | undefined>;
}) {
  if (!placeCreationEnabled(input.env ?? process.env)) {
    return { status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } };
  }
  if (!canCreatePlace(input.actor)) {
    return { status: 403, body: { ok: false, code: 'ACCESS_DENIED' } };
  }

  const result = await createPlaceDraft(input.sql, input.payload);
  if (!result.ok) {
    if (result.code === 'INVALID_REQUEST') {
      return { status: 400, body: result };
    }
    return { status: 500, body: { ok: false, code: 'CREATE_FAILED' } };
  }

  return { status: 201, body: result };
}
