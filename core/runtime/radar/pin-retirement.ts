// Removes only a published Radar map marker; no DELETE or cascading data changes.
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export async function retireRadarPin(db:Database,id:string,account:string,confirmName:string):Promise<boolean>{
 const rows=await db.unsafe(`WITH retired AS (
  UPDATE radar.establishments e SET published=false
  WHERE e.id=$1::uuid AND e.name=$3::text AND e.published
   AND e.digital_address_ref IS NULL
   AND (
    EXISTS (SELECT 1 FROM radar.verified_owners own WHERE own.establishment_id=e.id AND own.account_ref=$2::uuid)
    OR (
     (e.account_ref::text=$2::text OR EXISTS (SELECT 1 FROM radar.registration_profiles p WHERE p.establishment_id=e.id AND p.submitted_by=$2::uuid))
     AND NOT EXISTS (SELECT 1 FROM radar.verified_owners other WHERE other.establishment_id=e.id AND other.account_ref<>$2::uuid)
    )
   )
   AND NOT EXISTS (SELECT 1 FROM radar.campaigns c WHERE c.establishment_id=e.id AND c.status='APPROVED' AND c.ends_at>now())
  RETURNING e.id
 ), audited AS (
  INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
  SELECT $2::uuid,'USER','RADAR_PIN_RETIRED','radar_establishment',id::text,
   jsonb_build_object('published',false,'reason','SELF_SERVICE') FROM retired RETURNING entity_id
 ) SELECT entity_id FROM audited`,[id,account,confirmName]);
 return rows.length===1;
}
