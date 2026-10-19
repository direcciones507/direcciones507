import type { Sql } from 'postgres';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

/** Retire an owner's Core request or published address, preserving financial/audit history.
 * All public reads require ACTIVE; retirement is a durable tombstone.
 * The code remains reserved and cannot be reassigned.
 * Legacy migrations have external historical pages and require a separate process.
 */
export async function archiveUnprocessedRequest(sql:Sql,actorId:string,addressId:string) {
  if(!uuid.test(actorId)||!uuid.test(addressId))throw Error('REQUEST_NOT_FOUND');
  return sql.begin(async tx=>{
    const rows=await tx.unsafe(`SELECT a.id::text,a.source,a.status,a.code,a.publication_receipt,a.review_decision,a.request_data
      FROM ad507.addresses a JOIN ad507.address_ownership o ON o.address_id=a.id
      JOIN ad507.users u ON u.id=o.user_id
      WHERE a.id=$1::uuid AND o.user_id=$2::uuid AND o.ownership_role='OWNER'
      AND u.status='ACTIVE' AND a.source='USER_REQUEST'
      FOR UPDATE OF a`,[addressId,actorId]);
    if(!rows.length)throw Error('REQUEST_NOT_FOUND');
    const a=rows[0];
    if(a.status==='ARCHIVED'||a.request_data?.migration)throw Error('INVALID_STATE_TRANSITION');
    // Financial/legal records, all orders and an issued code are deliberately retained.
    // Active Core pages disappear because their public SQL readers require ACTIVE.
    // The schema constraint core_requests_uncoded_check requires a non-null key
    // for every code-less request, including ARCHIVED ones. Never clear that key:
    // it is an internal tombstone identifier, not an active public address.
    // Clear only the payload hash so an identical new request can be submitted.
    // Published records keep their code reserved and may release their key.
    await tx.unsafe(`UPDATE ad507.addresses SET status='ARCHIVED',
      request_key_hash=CASE WHEN code IS NULL THEN request_key_hash ELSE NULL END,
      request_payload_hash=NULL,updated_at=now()
      WHERE id=$1::uuid`,[addressId]);
    await tx.unsafe(`INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
      VALUES($1::uuid,'USER','OWNER_ADDRESS_RETIRED','ADDRESS',$2,$3::jsonb)`,
      [actorId,addressId,tx.json({previousStatus:a.status,hadCode:!!a.code,hadPublication:!!a.publication_receipt})]);
    return {id:addressId,status:'ARCHIVED',wasPublished:a.status==='ACTIVE'};
  });
}
