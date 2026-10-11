import type { Sql } from 'postgres';
import type { MediaAuthorization } from './r2-storage';

/** Bind only after general-auth.currentUser. Reads the existing ownership and media tables. */
export function createMediaAuthorizer(sql: Sql, actorId: string): MediaAuthorization {
  return async scope => {
    if (scope.ownerId !== actorId) return false;
    const rows = await sql.unsafe(`SELECT a.address_type,a.status,a.source,
      EXISTS(SELECT 1 FROM ad507.address_ownership o WHERE o.address_id=a.id AND o.user_id=u.id AND o.ownership_role='OWNER') AS owner,
      EXISTS(SELECT 1 FROM ad507.user_roles r WHERE r.user_id=u.id AND r.role='CLIENT') AS client,
      EXISTS(SELECT 1 FROM ad507.user_roles r WHERE r.user_id=u.id AND r.role='ADMIN') AS admin,
      EXISTS(SELECT 1 FROM ad507.address_media m WHERE m.address_id=a.id AND m.storage_key=$3
        AND m.media_type=$4) AS linked
      FROM ad507.addresses a JOIN ad507.users u ON u.id=$1::uuid AND u.status='ACTIVE'
      WHERE a.id=$2::uuid LIMIT 1`, [actorId, scope.addressId, scope.storageKey ?? null, scope.role === 'logo' ? 'LOGO' : 'IMAGE']);
    const row = rows[0];
    // Never read, upload or delete legacy/Residential media through the new request flow.
    if (!row || row.source !== 'USER_REQUEST' || row.address_type === 'RESIDENTIAL') return false;
    if (scope.action === 'read') return row.linked === true && (row.owner === true || row.admin === true);
    if (row.status !== 'DRAFT' || row.owner !== true || (row.client !== true && row.admin !== true)) return false;
    if (scope.action === 'delete') return row.linked === true;
    return row.address_type === 'BUSINESS' || (row.address_type === 'PLACE' && scope.role === 'photo');
  };
}
