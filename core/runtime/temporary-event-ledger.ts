/** Append-only internal history. Call from a transaction holding the order/event lock. */
export async function eventRecord(tx:any,orderId:string,action:string,metadata:Record<string,unknown>={}){
 await tx.unsafe("INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata) VALUES('SYSTEM',$2,'TEMPORARY_EVENT_ORDER',$1,$3::jsonb)",[orderId,action,tx.json(metadata)]);
}
export async function eventNotification(tx:any,orderId:string,type:string,metadata:Record<string,unknown>={}){
 const prior=await tx.unsafe("SELECT id FROM ad507.audit_log WHERE entity_type='TEMPORARY_EVENT_ORDER' AND entity_id=$1 AND action='TEMPORARY_EVENT_NOTIFICATION' AND metadata->>'type'=$2 LIMIT 1",[orderId,type]);
 if(!prior.length)await eventRecord(tx,orderId,'TEMPORARY_EVENT_NOTIFICATION',{...metadata,type,status:'AVAILABLE',channel:'ACCOUNT'});
}
/** The public read policy already blocks expired benefits; persist the same cutoff. No renewal. */
export async function expireTemporaryEvents(sql:any){
 return sql.begin(async(tx:any)=>{
  const expired=await tx.unsafe("UPDATE ad507.temporary_events SET status='EXPIRED',updated_at=now() WHERE status='ACTIVE' AND ((ends_on+2)::timestamp AT TIME ZONE event_timezone)<=now() RETURNING id,payment_order_id,ends_on,event_timezone");
  for(const e of expired){await eventRecord(tx,e.payment_order_id,'TEMPORARY_EVENT_EXPIRED',{eventId:e.id,endsOn:e.ends_on,timezone:e.event_timezone});await eventNotification(tx,e.payment_order_id,'EXPIRED',{eventId:e.id});}
  return expired.length;
 });
}
/** No provider call is implemented here. Only an independently verified server adapter can settle. */
export function createTemporaryEventRefunds(sql:any,verify?: (reference:string)=>Promise<{reference:string;providerOrderId:string;transactionId:string;amountCents:number;currency:string;environment:string;status:'PENDING'|'FAILED'|'CONFIRMED'}>){
 return {
  async request(orderId:string,requestId:string){
   if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))throw Error('INVALID_REFUND_REQUEST');
   return sql.begin(async(tx:any)=>{
    const rows=await tx.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE id=$1 FOR UPDATE',[orderId]);const order=rows[0];
    if(!order||order.status!=='PAID')throw Error('PAID_ORDER_REQUIRED');
    const prior=await tx.unsafe("SELECT metadata FROM ad507.audit_log WHERE entity_type='TEMPORARY_EVENT_ORDER' AND entity_id=$1 AND action='TEMPORARY_EVENT_REFUND_REQUESTED' LIMIT 1",[orderId]);
    if(prior.length){const confirmed=await tx.unsafe("SELECT id FROM ad507.audit_log WHERE entity_type='TEMPORARY_EVENT_ORDER' AND entity_id=$1 AND action='TEMPORARY_EVENT_REFUND_CONFIRMED' LIMIT 1",[orderId]);return {status:confirmed.length?'CONFIRMED':'PENDING_PROVIDER',unchanged:true};}
    await eventRecord(tx,orderId,'TEMPORARY_EVENT_REFUND_REQUESTED',{requestId,status:'PENDING_PROVIDER',amountCents:order.amount_cents,currency:order.currency});
    return {status:'PENDING_PROVIDER',unchanged:false};
   });
  },
  async confirm(orderId:string,reference:string){
   if(!verify)throw Error('REFUND_PROVIDER_UNAVAILABLE');
   if(typeof reference!=='string'||!reference||reference.length>300)throw Error('INVALID_REFUND_REFERENCE');
   let proof;
   try{proof=await verify(reference);}catch{await eventRecord(sql,orderId,'TEMPORARY_EVENT_REFUND_ERROR',{stage:'VERIFY',status:'PENDING_PROVIDER'});throw Error('REFUND_PROVIDER_UNCONFIRMED');}
   if(!['PENDING','FAILED','CONFIRMED'].includes(proof.status))throw Error('INVALID_REFUND_CONFIRMATION');
   return sql.begin(async(tx:any)=>{
    const rows=await tx.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE id=$1 FOR UPDATE',[orderId]);const order=rows[0];
    if(!order||order.status!=='PAID'||!order.confirmed_at||proof.reference!==reference||!reference||proof.providerOrderId!==order.provider_order_id||proof.transactionId!==order.provider_reference||proof.amountCents!==order.amount_cents||proof.currency!==order.currency||proof.environment!==order.environment)throw Error('INVALID_REFUND_CONFIRMATION');
    const prior=await tx.unsafe("SELECT id FROM ad507.audit_log WHERE entity_type='TEMPORARY_EVENT_ORDER' AND entity_id=$1 AND action='TEMPORARY_EVENT_REFUND_CONFIRMED' LIMIT 1",[orderId]);
    if(prior.length)return {status:'CONFIRMED',unchanged:true};
    await eventRecord(tx,orderId,'TEMPORARY_EVENT_REFUND_RESULT',{reference,status:proof.status});
    if(proof.status!=='CONFIRMED')return {status:proof.status,unchanged:false};
    await tx.unsafe("UPDATE ad507.temporary_events SET status='CANCELLED',updated_at=now() WHERE payment_order_id=$1 AND id=$2",[orderId,order.event_id]);
    await eventRecord(tx,orderId,'TEMPORARY_EVENT_REFUND_CONFIRMED',{reference,amountCents:proof.amountCents,currency:proof.currency});
    await eventNotification(tx,orderId,'REFUNDED',{eventId:order.event_id});
    // Keep the original captured payment immutable; refund is a separate ledger entry.
    return {status:'CONFIRMED',unchanged:false};
   }).catch(async error=>{await eventRecord(sql,orderId,'TEMPORARY_EVENT_REFUND_ERROR',{stage:'CONFIRM',error:'INVALID_REFUND_CONFIRMATION'});throw error;});
  }
 };
}
