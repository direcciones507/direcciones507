import {eventRecord,eventNotification} from './temporary-event-ledger';
/** Isolated event ledger; reuse Yappy V2 verification and the existing provider. */
import {randomBytes} from 'node:crypto';
import type {Sql} from 'postgres';
import {verifyYappyIPN,type YappyConfiguration} from './payment-policy';
import type {createYappyProvider} from './yappy-provider';
import {dbDate} from './temporary-event-repository';
import {temporaryEventQuote,eventIsExpired} from './temporary-event-lifecycle';
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
      VALUES($1,$2,$3,'INITIALIZING',$4) RETURNING *`,[eventId,randomBytes(7).toString('hex'),config.environment,temporaryEventQuote(dbDate(e.starts_on),dbDate(e.ends_on)).amountCents]);
    await tx.unsafe("UPDATE ad507.temporary_events SET status='AWAITING_PAYMENT',payment_order_id=$2,price_cents=$3,updated_at=now() WHERE id=$1",[eventId,rows[0].id,rows[0].amount_cents]);
    return rows[0];
   });
   // A committed intent survives ambiguous timeouts; never create another charge on retry.
   let result;
   try{result=await provider.createOrder({providerOrderId:order.provider_order_id,amountCents:order.amount_cents},alias);}catch{
    await eventRecord(sql,order.id,'TEMPORARY_EVENT_PAYMENT_ERROR',{stage:'INITIALIZE',status:'PENDING_RECONCILIATION'});throw Error('YAPPY_PROVIDER_UNCONFIRMED');
   }
   await sql.unsafe("UPDATE ad507.temporary_event_orders SET provider_reference=$2 WHERE id=$1 AND provider_reference='INITIALIZING'",[order.id,result.transactionId]);
   return {...result,orderId:order.id};
  },
  async confirm(query:URLSearchParams){
   let proof;
   try{proof=verifyYappyIPN(query,config);}catch{
    await eventRecord(sql,'UNMATCHED','TEMPORARY_EVENT_PAYMENT_ERROR',{stage:'VERIFY',error:'INVALID_PAYMENT_NOTIFICATION'});throw Error('INVALID_PAYMENT_SIGNATURE');
   }
   return sql.begin(async tx=>{
    const rows=await tx.unsafe('SELECT * FROM ad507.temporary_event_orders WHERE provider_order_id=$1 FOR UPDATE',[proof.orderId]);
    const p=rows[0];if(!p)throw Error('PAYMENT_NOT_FOUND');
    if(trialEventId&&p.event_id!==trialEventId)throw Error('INVALID_PAYMENT_ORDER');
    // V2 signs order/status/domain, not amount: bind receipt to the immutable server quote.
    if(![799,1299,1999].includes(p.amount_cents)||p.currency!=='USD'||p.environment!==config.environment||!p.provider_reference||p.provider_reference==='INITIALIZING')throw Error('INVALID_PAYMENT_ORDER');
    if(p.status==='PAID')return {ok:true,unchanged:true};
    if(proof.status!=='PAID'){
     if(p.status===proof.status)return {ok:true,unchanged:true};
     await eventRecord(tx,p.id,'TEMPORARY_EVENT_PAYMENT_STATUS',{from:p.status,to:proof.status,providerStatus:proof.providerStatus});
     await eventNotification(tx,p.id,proof.status,{eventId:p.event_id});
     await tx.unsafe('UPDATE ad507.temporary_event_orders SET status=$2 WHERE id=$1',[p.id,proof.status]);
     return {ok:true,unchanged:false};
    }
    const events=await tx.unsafe('SELECT * FROM ad507.temporary_events WHERE id=$1 FOR UPDATE',[p.event_id]);
    const e=events[0];if(!e||e.payment_order_id!==p.id||e.status!=='AWAITING_PAYMENT')throw Error('INVALID_PAYMENT_STATE');
    const photos=await tx.unsafe('SELECT slot FROM ad507.temporary_event_media WHERE event_id=$1',[e.id]);
    if(!photos.some(x=>x.slot===1)||photos.length>3)throw Error('PRIMARY_PHOTO_REQUIRED');
    await tx.unsafe("UPDATE ad507.temporary_event_orders SET status='PAID',confirmed_at=now() WHERE id=$1",[p.id]);
    await eventRecord(tx,p.id,'TEMPORARY_EVENT_PAYMENT_CONFIRMED',{eventId:e.id,amountCents:p.amount_cents,currency:p.currency,transactionId:p.provider_reference});
    const status=eventIsExpired(dbDate(e.ends_on),e.event_timezone,new Date())?'EXPIRED':'ACTIVE';
    const activated=await tx.unsafe('UPDATE ad507.temporary_events SET status=$2,payment_confirmed_at=now(),updated_at=now() WHERE id=$1 RETURNING payment_confirmed_at,((ends_on+2)::timestamp AT TIME ZONE event_timezone) AS expires_at',[e.id,status]);
    await eventRecord(tx,p.id,'TEMPORARY_EVENT_ACTIVATED',{eventId:e.id,status,startsOn:dbDate(e.starts_on),endsOn:dbDate(e.ends_on),timezone:e.event_timezone,activatedAt:activated[0].payment_confirmed_at,expiresAt:activated[0].expires_at});
    await eventNotification(tx,p.id,'PAYMENT_CONFIRMED',{eventId:e.id,status});
    return {ok:true,unchanged:false};
   }).catch(async error=>{await eventRecord(sql,proof.orderId,'TEMPORARY_EVENT_PAYMENT_ERROR',{stage:'CONFIRM',error:error instanceof Error?error.message:'PAYMENT_CONFIRMATION_FAILED'});throw error;});
  }
 };
}
