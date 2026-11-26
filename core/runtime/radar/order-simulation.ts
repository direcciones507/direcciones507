import {radarCommercialCatalog} from './commercial-catalog';
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
type Product='annual'|'live'|'featured';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const product=(value:unknown):value is Product=>value==='annual'||value==='live'||value==='featured';
// Internal simulation only: no public route, payment provider or entitlement mutation.
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
  async confirm(order:unknown,account:unknown){
   if(!enabled||!uuid(order)||!uuid(account))return null;
   const rows=await db.unsafe(`UPDATE radar.simulated_orders s SET confirmed_at=now(),
    simulated_until=now()+CASE s.product WHEN 'annual' THEN interval '1 year' WHEN 'live' THEN interval '1 hour' ELSE interval '1 day' END
    FROM radar.establishments e LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
    WHERE s.id=$1::uuid AND s.ordering_account=$2::uuid AND s.establishment_id=e.id AND e.published AND s.confirmed_at IS NULL
     AND (EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
      OR (p.submitted_by=$2::uuid AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)))
    RETURNING s.*`,[order,account]);
   return rows[0]??null;
  }
 };
}
