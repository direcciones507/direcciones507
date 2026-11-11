/**
 * PostgreSQL persistence for Dirección Temporal.
 * Development only: requires reviewed migration and route/auth wiring.
 * Payment confirmation must be performed by a verified provider callback,
 * never by a browser-supplied flag or this repository's createDraft method.
 */
import {randomBytes} from 'node:crypto';
import type {Sql} from 'postgres';
import {validateTemporaryEventDraft,eventSlug,type TemporaryEventDraft} from './temporary-event-draft';
import {canPublishTemporaryEvent,publicEventStatus} from './temporary-event-lifecycle';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const requireUuid=(id:string)=>{if(!uuid.test(id))throw Error('INVALID_ID')};
const dbDate=(value:unknown):string=>{
 if(value instanceof Date){if(Number.isNaN(value.valueOf()))throw Error('INVALID_DB_DATE');return value.toISOString().slice(0,10)}
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 throw Error('INVALID_DB_DATE');
};
type EventRow={id:string;slug:string;status:'DRAFT'|'AWAITING_PAYMENT'|'ACTIVE'|'EXPIRED'|'CANCELLED';starts_on:string;ends_on:string;event_timezone:string;payment_order_id:string|null;payment_confirmed_at:string|null};
export function createTemporaryEventRepository(sql:Sql){
 return {
  async createDraft(ownerId:string,input:unknown):Promise<{id:string;slug:string;status:'DRAFT'}>{
   requireUuid(ownerId);
   const x:TemporaryEventDraft=validateTemporaryEventDraft(input);
   // The DB unique index resolves the extremely unlikely slug collision.
   for(let attempt=0;attempt<3;attempt++){
    const slug=eventSlug(x.title,randomBytes(10).toString('hex'));
    try{
     const rows=await sql.unsafe(`INSERT INTO ad507.temporary_events
     (owner_user_id,slug,title,description,responsible_name,responsible_email,responsible_phone,
     public_contact_name,public_contact_phone,public_contact_consent,country_code,region,municipality,locality,
     reference,latitude,longitude,starts_on,ends_on,event_timezone,hours_description,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'DRAFT')
     RETURNING id,slug,status`,[
      ownerId,slug,x.title,x.description,x.responsibleName,x.responsibleEmail,x.responsiblePhone,
      x.publicContactConsent?x.publicContactName:null,x.publicContactConsent?x.publicContactPhone:null,
      x.publicContactConsent,x.countryCode,x.province,x.district,x.corregimiento,x.reference,
      x.latitude,x.longitude,x.startsOn,x.endsOn,x.timezone,x.hours]);
     return rows[0] as {id:string;slug:string;status:'DRAFT'};
    }catch(error){
     if((error as {code?:string}).code==='23505')continue;
     throw error;
    }
   }
   throw Error('EVENT_SLUG_COLLISION');
  },
  async getOwned(ownerId:string,eventId:string){
   requireUuid(ownerId);requireUuid(eventId);
   const rows=await sql.unsafe('SELECT * FROM ad507.temporary_events WHERE id=$1 AND owner_user_id=$2',[eventId,ownerId]);
   return rows[0]??null; // PRIVATE owner-only row; never serialize through public routes.
  },
  async getPublic(slug:string,now=new Date()){
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;
   const rows=await sql.unsafe(`SELECT id,slug,title,description,public_contact_name,public_contact_phone,
     public_contact_consent,country_code,region,municipality,locality,reference,latitude,longitude,
     starts_on,ends_on,event_timezone,hours_description,status,payment_confirmed_at
     FROM ad507.temporary_events WHERE slug=$1`,[slug]);
   const x=rows[0] as any;if(!x)return null;
   const state=publicEventStatus(x.status,dbDate(x.ends_on),x.event_timezone,now);
   if(state==='UNPUBLISHED'||!x.payment_confirmed_at)return null;
   // Never return responsible_name/email/phone.
   return {id:x.id,slug:x.slug,title:x.title,description:x.description,
    publicContactName:x.public_contact_consent?x.public_contact_name:null,
    publicContactPhone:x.public_contact_consent?x.public_contact_phone:null,
    countryCode:x.country_code,province:x.region,district:x.municipality,corregimiento:x.locality,
    reference:x.reference,latitude:x.latitude==null?null:Number(x.latitude),longitude:x.longitude==null?null:Number(x.longitude),
    startsOn:dbDate(x.starts_on),endsOn:dbDate(x.ends_on),timezone:x.event_timezone,hours:x.hours_description,
    status:state};
  },
  /**
   * Called only after a trusted payment adapter independently verifies and persists
   * the provider receipt. The adapter must authenticate IPN, amount, currency,
   * order ownership and idempotency before invoking this method.
   */
  async activateVerified(eventId:string,orderId:string,now=new Date()):Promise<boolean>{
   requireUuid(eventId);requireUuid(orderId);
   return sql.begin(async tx=>{
    const rows=await tx.unsafe(`SELECT id,status,starts_on,ends_on,event_timezone,payment_order_id,
      payment_confirmed_at FROM ad507.temporary_events WHERE id=$1 FOR UPDATE`,[eventId]);
    const e=rows[0] as EventRow|undefined;if(!e)return false;
    if(e.status==='ACTIVE')return e.payment_order_id===orderId&&!!e.payment_confirmed_at;
    if(e.payment_order_id!==orderId)return false;
    const count=await tx.unsafe(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE slot=1)::int AS primary_count
      FROM ad507.temporary_event_media WHERE event_id=$1`,[eventId]);
    const allowed=canPublishTemporaryEvent({status:e.status,paymentOrderId:e.payment_order_id,
      paymentConfirmedAt:e.payment_confirmed_at,startsOn:dbDate(e.starts_on),
      endsOn:dbDate(e.ends_on),timezone:e.event_timezone,now,
      photoCount:Number(count[0].total),hasPrimaryPhoto:Number(count[0].primary_count)===1});
    if(!allowed)return false;
    await tx.unsafe(`UPDATE ad507.temporary_events SET status='ACTIVE',updated_at=now()
      WHERE id=$1 AND status='AWAITING_PAYMENT'`,[eventId]);
    return true;
   });
  }
 };
}
