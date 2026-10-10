import { moderatePlace } from './place-moderation-repository';
import type { PlaceModerationAction, PlaceModerationStatus } from './place-moderation';
import type { SqlExecutor } from './public-address-repository';

export type PlaceModeratorActor = { authenticated: boolean; roles: string[] };

export function placeModerationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AD507_PLACE_MODERATION_ENABLED === 'true';
}

function canModeratePlace(actor: PlaceModeratorActor): boolean {
  return actor.authenticated && actor.roles.includes('ADMIN');
}

/** Moderation is intentionally ADMIN-only; operators may prepare drafts but cannot publish them. */
export async function handleModeratePlace(input: {
  sql: SqlExecutor;
  actor: PlaceModeratorActor;
  code: string;
  currentStatus: PlaceModerationStatus;
  action: PlaceModerationAction;
  env?: Record<string, string | undefined>;
}) {
  if (!placeModerationEnabled(input.env ?? process.env)) {
    return { status: 404, body: { ok: false, code: 'NOT_AVAILABLE' } };
  }
  if (!canModeratePlace(input.actor)) {
    return { status: 403, body: { ok: false, code: 'ACCESS_DENIED' } };
  }

  const result = await moderatePlace(input.sql, {
    code: input.code,
    currentStatus: input.currentStatus,
    action: input.action,
  });

  if (!result.ok) {
    if (result.code === 'INVALID_TRANSITION') return { status: 400, body: result };
    if (result.code === 'STALE_STATE') return { status: 409, body: result };
    return { status: 500, body: { ok: false, code: 'UPDATE_FAILED' } };
  }

  return { status: 200, body: result };
}
