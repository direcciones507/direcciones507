import {radarOrderOwner,radarVerifiedOrder} from './verified-orders';
import {radarCommercialCatalog} from './commercial-catalog';

type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const validOrder=`o.status='PAID' AND o.user_id=m.account_id AND o.address_id IS NULL
 AND o.payment_environment='production' AND o.confirmed_at=m.confirmed_at AND o.currency='USD' AND o.amount_cents=$2::int
 AND nullif(trim(o.provider_reference),'') IS NOT NULL AND nullif(trim(o.provider),'') IS NOT NULL`;
const owner=`EXISTS (SELECT 1 FROM radar.verified_owners v WHERE v.establishment_id=m.establishment_id AND v.account_ref=m.account_id)
 OR (EXISTS (SELECT 1 FROM radar.registration_profiles p WHERE p.establishment_id=m.establishment_id AND p.submitted_by=m.account_id)
 AND NOT EXISTS (SELECT 1 FROM radar.verified_owners v WHERE v.establishment_id=m.establishment_id))`;

export async function radarAnnualUntil(db:Database,ids:string[],now=Date.now(),verifiedOrders=false):Promise<Map<string,number>>{
 if(!ids.length)return new Map();
 try{
  const rows=await db.unsafe(`SELECT m.establishment_id::text id,max(m.ends_at) AS deadline
   FROM radar.annual_memberships m JOIN ad507.orders o ON o.id=m.order_id
   WHERE m.establishment_id=ANY(string_to_array($1::text, ',')::uuid[])
   AND ${validOrder} AND (${owner}) AND m.starts_at<=$3::timestamptz AND m.ends_at>$3::timestamptz
   ${verifiedOrders?`AND EXISTS(SELECT 1 FROM radar.verified_order_intents b WHERE b.order_id=m.order_id
     AND b.establishment_id=m.establishment_id AND b.product='annual' AND (${radarVerifiedOrder}) AND (${radarOrderOwner}))`:''}
   GROUP BY m.establishment_id`,[ids.join(','),radarCommercialCatalog.annual.amountCents,new Date(now).toISOString()]);
  return new Map(rows.map(row=>[row.id,new Date(row.deadline).getTime()]));
 }catch(error){
  if((error as {code?:string})?.code==='42P01')return new Map();
  throw error;
 }
}

export async function radarAnnualHistory(db:Database,id:string){
 return db.unsafe(`SELECT e.name AS establishment,COALESCE(NULLIF(u.display_name,''),'Cuenta sin nombre') AS owner,
  o.amount_cents AS "amountCents",o.created_at AS "createdAt",
  CASE WHEN ${validOrder} THEN m.confirmed_at END AS "paidAt",m.ends_at AS "endsAt",
  CASE WHEN (${validOrder}) IS NOT TRUE THEN 'INVALID' WHEN NOT (${owner}) THEN 'OWNER_CHANGED'
   WHEN m.ends_at<=now() THEN 'EXPIRED' WHEN m.starts_at>now() THEN 'SCHEDULED' ELSE 'ACTIVE' END AS status
  FROM radar.annual_memberships m JOIN ad507.orders o ON o.id=m.order_id
  JOIN radar.establishments e ON e.id=m.establishment_id LEFT JOIN ad507.users u ON u.id=m.account_id
  WHERE e.id=$1::uuid ORDER BY o.created_at DESC,o.id LIMIT 100`,[id,radarCommercialCatalog.annual.amountCents]);
}
