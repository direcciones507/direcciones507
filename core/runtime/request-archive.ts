import type { Sql } from 'postgres';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** Remove an owner's unprocessed request from their account without deleting historical data.
 * A transaction/row lock prevents review or payment initiation from racing the archive.
 * This never deletes generated codes, published pages, payments, media or legacy records.
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
    if(!['DRAFT','PENDING_REVIEW'].includes(a.status)||a.code!==null||a.publication_receipt!==null||
      a.review_decision!==null||a.request_data?.createdByAdmin||a.request_data?.migration)
      throw Error('INVALID_STATE_TRANSITION');
    // Never withdraw a request after an order has been created, even if payment
    // currently says pending/failed. Keep provider reconciliation and audit intact.
    const orders=await tx.unsafe('SELECT 1 FROM ad507.orders WHERE address_id=$1::uuid LIMIT 1',[addressId]);
    if(orders.length)throw Error('INVALID_STATE_TRANSITION');
    await tx.unsafe(`UPDATE ad507.addresses SET status='ARCHIVED',
      request_key_hash=NULL,request_payload_hash=NULL,updated_at=now()
      WHERE id=$1::uuid`,[addressId]);
    await tx.unsafe(`INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id)
      VALUES($1::uuid,'USER','UNPROCESSED_REQUEST_ARCHIVED','ADDRESS',$2)`,[actorId,addressId]);
    return {id:addressId,status:'ARCHIVED'};
  });
}
