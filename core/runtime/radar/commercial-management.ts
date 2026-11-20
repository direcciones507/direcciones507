import {validateRegistrationProfile} from './registration';
import {validateBusiness} from './business';
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createCommercialManagement(db:Database){return {
 async inspect(id:string,account:string){
  const rows=await db.unsafe(`SELECT e.id,e.name,e.category,p.profile,d.quantity,d.unit FROM radar.establishments e
   JOIN radar.verified_owners o ON o.establishment_id=e.id AND o.account_ref=$2::uuid
   LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
   LEFT JOIN radar.business_details d ON d.establishment_id=e.id AND d.updated_by=o.account_ref
   WHERE e.id=$1::uuid AND e.published`,[id,account]);return rows[0]??null;
 },
 async update(id:string,account:string,input:unknown,availability?:unknown){
  const item=await this.inspect(id,account);if(!item)return 'OWNER_REQUIRED';
  const profile=validateRegistrationProfile(input,item.category);if(!profile)return 'INVALID_PROFILE';
  const capacity=availability===undefined?null:validateBusiness(availability&&typeof availability==='object'?{...availability,hours:profile.hours}:null);
  if(availability!==undefined&&!capacity)return 'INVALID_PROFILE';
  const rows=await db.unsafe(`WITH owner AS MATERIALIZED (
   SELECT o.establishment_id FROM radar.verified_owners o JOIN radar.establishments e ON e.id=o.establishment_id
   WHERE o.establishment_id=$1::uuid AND o.account_ref=$2::uuid AND e.published FOR UPDATE OF o
  ),saved AS (
   INSERT INTO radar.registration_profiles(establishment_id,submitted_by,profile)
   SELECT establishment_id,$2::uuid,$3::text::jsonb FROM owner
   ON CONFLICT(establishment_id) DO UPDATE SET profile=EXCLUDED.profile RETURNING establishment_id
  ),hours_saved AS (
   INSERT INTO radar.business_details(establishment_id,updated_by,hours,quantity,unit)
   SELECT establishment_id,$2::uuid,$3::text::jsonb->'hours',$4::int,COALESCE($5::text,'units') FROM saved
   ON CONFLICT(establishment_id) DO UPDATE SET hours=EXCLUDED.hours,updated_by=EXCLUDED.updated_by,updated_at=now(),
    quantity=CASE WHEN $6::boolean THEN EXCLUDED.quantity ELSE radar.business_details.quantity END,
    unit=CASE WHEN $6::boolean THEN EXCLUDED.unit ELSE radar.business_details.unit END
   RETURNING establishment_id
  ) INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
  SELECT $2::uuid,'USER','RADAR_COMMERCIAL_PROFILE_UPDATED','radar_establishment',establishment_id::text,
   '{"publicProfileUpdated":true}'::jsonb FROM saved RETURNING entity_id`,[id,account,JSON.stringify(profile),capacity?.quantity??null,capacity?.unit??null,capacity!==null]);
  return rows.length===1?'UPDATED':'OWNER_REQUIRED';
 }
};}
