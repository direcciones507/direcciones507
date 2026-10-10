import { nextPlaceModerationStatus, type PlaceModerationAction, type PlaceModerationStatus } from './place-moderation';
import type { SqlExecutor } from './public-address-repository';

export async function moderatePlace(
  sql: SqlExecutor,
  input: { code: string; currentStatus: PlaceModerationStatus; action: PlaceModerationAction },
): Promise<
  | { ok: true; code: string; status: PlaceModerationStatus }
  | { ok: false; code: 'INVALID_TRANSITION' | 'STALE_STATE' | 'UPDATE_FAILED' }
> {
  const nextStatus = nextPlaceModerationStatus(input.currentStatus, input.action);
  if (!nextStatus) return { ok: false, code: 'INVALID_TRANSITION' };

  try {
    const rows = await sql<{ code: string; status: PlaceModerationStatus }>`
      UPDATE ad507.addresses
      SET status = ${nextStatus}, updated_at = now()
      WHERE code = ${input.code}
        AND address_type = 'PLACE'
        AND status = ${input.currentStatus}
      RETURNING code, status
    `;

    const row = rows[0];
    if (!row) return { ok: false, code: 'STALE_STATE' };
    return { ok: true, code: row.code, status: row.status };
  } catch {
    return { ok: false, code: 'UPDATE_FAILED' };
  }
}
