import { generatePlaceCodeCandidate } from './place-code';
import { validatePlaceDraft, type PlaceDraftInput } from './place-draft';
import type { SqlExecutor } from './public-address-repository';

export type CreatedPlaceDraft = { code: string; status: 'DRAFT' };

/**
 * Creates a PLACE only as DRAFT. Publication is deliberately a separate operation.
 * The database UNIQUE constraint remains the final authority for code uniqueness.
 * landline_phone belongs to the future migration schema and is not applied to production here.
 */
export async function createPlaceDraft(
  sql: SqlExecutor,
  input: PlaceDraftInput,
  options: { attempts?: number; entropy?: () => string } = {},
): Promise<{ ok: true; place: CreatedPlaceDraft } | { ok: false; code: string; field?: string }> {
  const validated = validatePlaceDraft(input);
  if (!validated.ok) return validated;

  const attempts = Math.max(1, Math.min(5, Math.trunc(options.attempts ?? 3)));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = generatePlaceCodeCandidate(validated.value.name, options.entropy?.());
    try {
      const rows = await sql<{ code: string; status: 'DRAFT' }>`
        INSERT INTO ad507.addresses (
          code, address_type, status, name, reference, description,
          latitude, longitude, phone, landline_phone, hours
        ) VALUES (
          ${code}, 'PLACE', 'DRAFT', ${validated.value.name}, ${validated.value.reference},
          ${validated.value.description}, ${validated.value.latitude}, ${validated.value.longitude},
          ${validated.value.phone}, ${validated.value.landlinePhone}, ${validated.value.hours}
        )
        RETURNING code, status
      `;
      const row = rows[0];
      if (!row) return { ok: false, code: 'CREATE_FAILED' };
      return { ok: true, place: { code: row.code, status: row.status } };
    } catch (error) {
      const pgCode = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
      if (pgCode === '23505' && attempt + 1 < attempts) continue;
      return { ok: false, code: pgCode === '23505' ? 'CODE_COLLISION' : 'CREATE_FAILED' };
    }
  }
  return { ok: false, code: 'CODE_COLLISION' };
}
