import type {Sql} from 'postgres';
import {radarCommercialCatalog} from './commercial-catalog';

export const verifiedRadarOrdersEnabled=(env:Record<string,string|undefined>)=>
 env.RADAR_COMMERCIAL_MODEL_ENABLED==='true'&&env.RADAR_VERIFIED_ORDERS_ENABLED==='true';

// Fixed SQL fragments. Aliases identify a Radar intent b and its CORE order o.
export const radarOrderOwner=`EXISTS (SELECT 1 FROM radar.verified_owners v WHERE v.establishment_id=b.establishment_id AND v.account_ref=b.account_id)
 OR (EXISTS (SELECT 1 FROM radar.registration_profiles p WHERE p.establishment_id=b.establishment_id AND p.submitted_by=b.account_id)
 AND NOT EXISTS (SELECT 1 FROM radar.verified_owners v WHERE v.establishment_id=b.establishment_id))`;
export const radarVerifiedOrder=`o.status='PAID' AND o.payment_environment='production'
 AND o.address_id IS NULL AND o.user_id=b.account_id AND o.currency='USD' AND o.confirmed_at>=b.bound_at
 AND o.amount_cents=CASE b.product WHEN 'annual' THEN ${radarCommercialCatalog.annual.amountCents}
 WHEN 'live' THEN ${radarCommercialCatalog.live.amountCents} ELSE ${radarCommercialCatalog.featured.amountCents} END
 AND nullif(trim(o.provider_reference),'') IS NOT NULL AND nullif(trim(o.provider_order_id),'') IS NOT NULL
 AND nullif(trim(o.provider),'') IS NOT NULL
 AND EXISTS(SELECT 1 FROM ad507.audit_log a WHERE a.actor_type='SYSTEM' AND a.entity_type='ORDER' AND a.entity_id=o.id::text
  AND a.action='RADAR_PROVIDER_PAYMENT_VERIFIED' AND a.created_at>=b.bound_at
  AND a.after_json @> jsonb_build_object('status','PAID','provider',o.provider,
   'providerOrderId',o.provider_order_id,'providerReference',o.provider_reference))`;

export const radarCampaignOrderGuard=`AND (
 NOT EXISTS(SELECT 1 FROM radar.verified_order_intents b WHERE b.order_id=c.id)
 OR EXISTS(SELECT 1 FROM radar.verified_order_intents b JOIN ad507.orders o ON o.id=b.order_id
  WHERE b.order_id=c.id AND b.establishment_id=c.establishment_id AND b.product=c.kind
   AND (${radarVerifiedOrder}) AND (${radarOrderOwner}))
)`;

// Server-only handoff for a future authorized provider adapter. No route accepts payment proof.
export function createRadarVerifiedOrderReconciler(db:Sql,enabled=false){
 return async(orderId:string)=>{
  if(!enabled||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(orderId))return false;
  return db.begin(async tx=>{
   const [lock]=await tx.unsafe(`SELECT e.id FROM radar.establishments e JOIN radar.verified_order_intents b ON b.establishment_id=e.id
    WHERE b.order_id=$1::uuid AND e.published FOR UPDATE OF e`,[orderId]);
   if(!lock)return false;
   const [order]=await tx.unsafe(`SELECT b.product,b.account_id,o.provider,o.provider_reference,o.confirmed_at::text AS confirmed_at
    FROM radar.verified_order_intents b JOIN ad507.orders o ON o.id=b.order_id
    WHERE b.order_id=$1::uuid AND (${radarVerifiedOrder}) AND (${radarOrderOwner}) FOR UPDATE OF o`,[orderId]);
   if(!order)return false;
   const receipts=await tx.unsafe(`INSERT INTO radar.verified_order_receipts(provider,provider_reference,order_id)
    VALUES($1,$2,$3::uuid) ON CONFLICT DO NOTHING RETURNING order_id`,[order.provider,order.provider_reference,orderId]);
   if(!receipts.length)return false;
   const annual=order.product==='annual';
   const records=annual?'radar.annual_memberships':'radar.campaigns';
   const identifier=annual?'order_id':'id';
   const columns=annual?'order_id,establishment_id,account_id,confirmed_at,starts_at,ends_at':'id,establishment_id,ordering_account,kind,starts_at,ends_at,status';
   const productValue=annual?'$5::timestamptz':'$4::text';
   const duration=annual?"interval '1 year'":order.product==='live'?"interval '1 hour'":"interval '1 day'";
   const rows=await tx.unsafe(`WITH term AS (
    SELECT greatest($5::timestamptz,max(m.ends_at)) AT TIME ZONE 'UTC' AS start_utc
    FROM ${records} m JOIN radar.verified_order_intents b ON b.order_id=m.${identifier}
    JOIN ad507.orders o ON o.id=b.order_id
    WHERE m.establishment_id=$2::uuid AND b.product=$4 AND (${radarVerifiedOrder}) AND (${radarOrderOwner})
   ) INSERT INTO ${records}(${columns})
   SELECT $1::uuid,$2::uuid,$3::uuid,${productValue},start_utc AT TIME ZONE 'UTC',
    (start_utc+${duration}) AT TIME ZONE 'UTC'${annual?'':",'APPROVED'"} FROM term
   ON CONFLICT(${identifier}) DO NOTHING RETURNING ${identifier}`,[orderId,lock.id,order.account_id,order.product,order.confirmed_at]);
   if(!rows.length)throw Error('RADAR_BENEFIT_RECORD_CONFLICT');
   await tx.unsafe(`INSERT INTO ad507.audit_log(actor_type,action,entity_type,entity_id,metadata)
    VALUES('SYSTEM','RADAR_BENEFIT_GRANTED','ORDER',$1,jsonb_build_object('establishmentId',$2::text,'product',$3::text))`,[orderId,lock.id,order.product]);
   return rows.length===1;
  });
 };
}
