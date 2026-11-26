import {radarCommercialCatalog} from './commercial-catalog';
import {randomUUID} from 'node:crypto';
import type {Sql} from 'postgres';
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
type Product='annual'|'live'|'featured';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const product=(value:unknown):value is Product=>value==='annual'||value==='live'||value==='featured';
export const radarPromotionSimulationEnabled=(env:Record<string,string|undefined>)=>
 env.RADAR_PROMOTION_SIMULATION_ENABLED==='true'&&env.RADAR_COMMERCIAL_MODEL_ENABLED==='true'&&
 env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase()!=='production';

// Simulation only: isolated order table with no payment provider or entitlement mutation.
export function createRadarOrderSimulation(db:Database,enabled=false){
 return {
  async create(establishment:unknown,account:unknown,kind:unknown,requestKey:unknown){
   if(!enabled||!uuid(establishment)||!uuid(account)||!uuid(requestKey)||!product(kind))return null;
   const rows=await db.unsafe(`INSERT INTO radar.simulated_orders(establishment_id,ordering_account,request_key,product,amount_cents)
    SELECT e.id,$2::uuid,$3::uuid,$4::text,$5::int FROM radar.establishments e
    LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
    WHERE e.id=$1::uuid AND e.published AND
     (EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
      OR (p.submitted_by=$2::uuid AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)))
    ON CONFLICT(ordering_account,request_key) DO NOTHING RETURNING *`,
    [establishment,account,requestKey,kind,radarCommercialCatalog[kind].amountCents]);
   if(rows[0])return rows[0];
   const existing=await db.unsafe(`SELECT s.* FROM radar.simulated_orders s JOIN radar.establishments e ON e.id=s.establishment_id
    LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
    WHERE s.establishment_id=$1::uuid AND s.ordering_account=$2::uuid AND s.request_key=$3::uuid AND s.product=$4::text AND e.published
     AND (EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
      OR (p.submitted_by=$2::uuid AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)))`,
    [establishment,account,requestKey,kind]);
   return existing[0]??null;
  },
  async confirm(order:unknown,account:unknown,after:string|null=null){
   if(!enabled||!uuid(order)||!uuid(account))return null;
   const rows=await db.unsafe(`UPDATE radar.simulated_orders s SET confirmed_at=now(),
    simulated_until=greatest(now(),$3::timestamptz)+CASE s.product WHEN 'annual' THEN interval '1 year' WHEN 'live' THEN interval '1 hour' ELSE interval '1 day' END
    FROM radar.establishments e LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
    WHERE s.id=$1::uuid AND s.ordering_account=$2::uuid AND s.establishment_id=e.id AND e.published AND s.confirmed_at IS NULL
     AND (EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
      OR (p.submitted_by=$2::uuid AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)))
    RETURNING s.*`,[order,account,after]);
   return rows[0]??null;
  }
 };
}


export async function manageRadarPromotionSimulation(db:Sql,account:string,body:any){
 if(!uuid(account)||!uuid(body?.id))return null;
 const list=body.action==='promotion_simulation_status';
 const kind=body.product;
 if(!list&&(!product(kind)||(body.previous!==null&&!uuid(body.previous))))return null;
 return db.begin(async tx=>{
  const lock=list?'':'FOR UPDATE OF e';
  const allowed=await tx.unsafe(`SELECT 1 FROM radar.establishments e
   LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
   WHERE e.id=$1::uuid AND e.published AND e.digital_address_ref IS NULL
   AND (EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
    OR (p.submitted_by=$2::uuid AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)))
   ${lock}`,[body.id,account]);
  if(!allowed.length)return null;
  const items=await tx.unsafe<{id:string;product:string;ends_at:string}[]>(`SELECT DISTINCT ON (product)
   id::text,product,simulated_until::text AS ends_at FROM radar.simulated_orders
   WHERE establishment_id=$1::uuid AND ordering_account=$2::uuid AND product IN ('annual','live','featured')
    AND confirmed_at IS NOT NULL ORDER BY product,simulated_until DESC,id`,[body.id,account]);
  if(list)return {items};
  const previous=items.find(row=>row.product===kind);
  // The previous order is an optimistic concurrency token across tabs and retries.
  if((previous?.id??null)!==body.previous)return {items,stale:true};
  const simulation=createRadarOrderSimulation(tx,true);
  const order=await simulation.create(body.id,account,kind,randomUUID());
  if(!order)return null;
  const confirmed=await simulation.confirm(order.id,account,previous?.ends_at??null);
  if(!confirmed)throw Error('RADAR_SIMULATION_CONFIRMATION_FAILED');
  return {items:[...items.filter(row=>row.product!==kind),{id:confirmed.id,product:kind,ends_at:confirmed.simulated_until}]};
 });
}
