/** Isolated event ledger; reuse Yappy V2 verification and the existing provider. */
import {randomBytes} from 'node:crypto';
import type {Sql} from 'postgres';
import {verifyYappyIPN,type YappyConfiguration} from './payment-policy';
import type {createYappyProvider} from './yappy-provider';
import {dbDate} from './temporary-event-repository';
import {eventIsExpired} from './temporary-event-lifecycle';
export function createTemporaryEventPayment(sql:Sql,config:YappyConfiguration,provider:ReturnType<typeof createYappyProvider>,trialEventId?:string){
 return {
  async initialize(userId:string,eventId:string,alias:string){
   if(trialEventId&&eventId!==trialEventId)throw Error('EVENT_NOT_PAYABLE');
   if(typeof alias!=='string'||!/^6\d{7}$/.test(alias))throw Error('INVALID_YAPPY_ALIAS');
   const order=await sql.begin(async tx=>{
    const events=await tx.unsafe('SELECT * FROM ad507.temporary_events WHERE id=$1 AND owner_user_id=$2 FOR UPDATE',[eventId,userId]);
    const e=events[0];if(!e)throw Error('EVENT_NOT_FOUND');
    if(e.country_code!=='PA')throw Error('EVENT_NOT_PAYABLE');
    if(e.status!=='DRAFT'||eventIsExpired(dbDate(e.ends_on),e.event_timezone,new Date()))throw Error('EVENT_NOT_PAYABLE');
    const media=await tx.unsafe('SELECT slot FROM ad507.temporary_event_media WHERE event_id=$1',[eventId]);
    if(!media.some(x=>x.slot===1)||media.length>3)throw Error('PRIMARY_PHOTO_REQUIRED');
    const rows=await tx.unsafe(`INSERT INTO ad507.temporary_event_orders(event_id,provider_order_id,environment,provider_reference,amount_cents)
      VALUES($1,$2,$3,'INITIALIZING',1299) RETURNING *`,[eventId,randomBytes(7).toString('hex'),config.environment]);
    await tx.unsafe("UPDATE ad507.temporary_events SET status='AWAITING_PAYMENT',payment_order_id=$2,updated_at=now() WHERE id=$1",[eventId,rows[0].id]);
    return rows[0];
   });
   // A committed intent survives ambiguous timeouts; never create another charge on retry.
   const result=await provider.createOrder({providerOrderId:order.provider_order_id,amountCents:order.amount_cents},alias);
   await sql.unsafe("UPDATE ad507.temporary_event_orders SET provider_reference=$2 WHERE id=$1 AND provider_reference='INITIALIZING'",[order.id,result.transactionId]);
   return {...result,orderId:order.id};
  },
  async confirm(query:URLSearchParams){
   const proof=verifyYappyIPN(query,config);
   return sql.begin(async tx=>{
    const rows=await tx.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE provider_order_id=$1 FOR UPDATE',[proof.orderId]);
    const p=rows[0];if(!p)throw Error('PAYMENT_NOT_FOUND');
    if(trialEventId&&p.event_id!==trialEventId)throw Error('INVALID_PAYMENT_ORDER');
    // V2 signs order/status/domain, not amount: bind receipt to the immutable server quote.
    if(![799,1299].includes(p.amount_cents)||p.currency!=='USD'||p.environment!==config.environment||!p.provider_reference||p.provider_reference==='INITIALIZING')throw Error('INVALID_PAYMENT_ORDER');
    if(p.status==='PAID')return {ok:true,unchanged:true};
    if(proof.status!=='PAID'){
     await tx.unsafe('UPDATE ad507.temporary_event_orders SET status=$2 WHERE id=$1',[p.id,proof.status]);
     return {ok:true,unchanged:false};
    }
    const events=await tx.unsafe('SELECT * FROM ad507.temporary_events WHERE id=$1 FOR UPDATE',[p.event_id]);
    const e=events[0];if(!e||e.payment_order_id!==p.id||e.status!=='AWAITING_PAYMENT')throw Error('INVALID_PAYMENT_STATE');
    const photos=await tx.unsafe('SELECT slot FROM ad507.temporary_event_media WHERE event_id=$1',[e.id]);
    if(!photos.some(x=>x.slot===1)||photos.length>3)throw Error('PRIMARY_PHOTO_REQUIRED');
    await tx.unsafe("UPDATE ad507.temporary_event_orders SET status='PAID',confirmed_at=now() WHERE id=$1",[p.id]);
    const status=eventIsExpired(dbDate(e.ends_on),e.event_timezone,new Date())?'EXPIRED':'ACTIVE';
    await tx.unsafe('UPDATE ad507.temporary_events SET status=$2,payment_confirmed_at=now(),updated_at=now() WHERE id=$1',[e.id,status]);
    return {ok:true,unchanged:false};
   });
  }
 };
}
