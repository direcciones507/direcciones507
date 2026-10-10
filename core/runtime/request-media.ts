import type { Sql } from 'postgres';
import { createMediaAuthorizer } from './r2-media-authorization';
import { createR2Storage, type MediaIntent, type R2Settings } from './r2-storage';

/** Uses the canonical tables only. No schema changes, address creation or publication. */
export function createRequestMediaStorage(sql: Sql, actorId: string, settings: R2Settings, http?: typeof fetch) {
  const authorize = createMediaAuthorizer(sql, actorId);
  const registerIntent: MediaIntent = async scope => {
    await sql.begin(async tx => {
      // Serialize media quota/idempotency checks for this address across replicas.
      await tx.unsafe('SELECT id FROM ad507.addresses WHERE id=$1::uuid FOR UPDATE', [scope.addressId]);
      if (!await createMediaAuthorizer(tx as unknown as Sql, actorId)({ ...scope, action: 'upload' })) throw new Error('MEDIA_FORBIDDEN');
      const mediaType = scope.role === 'logo' ? 'LOGO' : 'IMAGE';
      const existing = await tx.unsafe('SELECT media_type FROM ad507.address_media WHERE address_id=$1::uuid AND storage_key=$2', [scope.addressId, scope.storageKey]);
      if (existing.length) {
        if (existing.length !== 1 || existing[0].media_type !== mediaType) throw new Error('MEDIA_CONFLICT');
        return;
      }
      const rows = await tx.unsafe(`SELECT a.address_type,p.code AS plan,
        (SELECT count(*)::int FROM ad507.address_media m WHERE m.address_id=a.id AND m.media_type=$2) AS count
        FROM ad507.addresses a LEFT JOIN ad507.plans p ON p.id=a.plan_id WHERE a.id=$1::uuid`, [scope.addressId, mediaType]);
      const row = rows[0];
      const limit = scope.role === 'logo' ? (row.address_type === 'BUSINESS' ? 1 : 0)
        : row.address_type === 'PLACE' ? 1 : row.plan === 'BUSINESS_PREMIUM_PRO' ? 5 : 0;
      if (row.count >= limit) throw new Error('MEDIA_LIMIT_EXCEEDED');
      const inserted = await tx.unsafe(`INSERT INTO ad507.address_media(address_id,media_type,storage_key,position,is_primary,upload_status)
        VALUES($1::uuid,$2,$3,$4,$5,'PENDING') RETURNING id::text`, [scope.addressId, mediaType, scope.storageKey, row.count, row.count === 0]);
      await tx.unsafe(`INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id)
        VALUES($1::uuid,'USER','MEDIA_UPLOAD_INTENT','ADDRESS_MEDIA',$2)`, [actorId, inserted[0].id]);
    });
  };
  // Failed PUT leaves its private storage_key linked for bounded, explicit recovery.
  // Never delete the link on timeout: the upstream object may already have been written.
  const completeIntent: MediaIntent = async scope => {
    await sql.begin(async tx=>{
      await tx.unsafe('SELECT id FROM ad507.addresses WHERE id=$1::uuid FOR UPDATE',[scope.addressId]);
      if(!await createMediaAuthorizer(tx as unknown as Sql,actorId)({...scope,action:'upload'}))throw Error('MEDIA_FORBIDDEN');
      await tx.unsafe("UPDATE ad507.address_media SET upload_status='READY' WHERE address_id=$1::uuid AND storage_key=$2",[scope.addressId,scope.storageKey]);
    });
  };
  return createR2Storage(settings, { authorize, registerIntent, completeIntent, fetch: http });
}
