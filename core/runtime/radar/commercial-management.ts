import {validateRegistrationProfile} from './registration';
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createCommercialManagement(db:Database){return {
 async inspect(id:string,account:string){
  const rows=await db.unsafe(`SELECT e.id,e.name,e.category,p.profile FROM radar.establishments e
   JOIN radar.verified_owners o ON o.establishment_id=e.id AND o.account_ref=$2::uuid
   LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
   WHERE e.id=$1::uuid AND e.published`,[id,account]);return rows[0]??null;
 },
 async update(id:string,account:string,input:unknown){
  const item=await this.inspect(id,account);if(!item)return 'OWNER_REQUIRED';
  const profile=validateRegistrationProfile(input,item.category);if(!profile)return 'INVALID_PROFILE';
  const rows=await db.unsafe(`WITH owner AS MATERIALIZED (
   SELECT o.establishment_id FROM radar.verified_owners o JOIN radar.establishments e ON e.id=o.establishment_id
   WHERE o.establishment_id=$1::uuid AND o.account_ref=$2::uuid AND e.published FOR UPDATE OF o
  ),saved AS (
   INSERT INTO radar.registration_profiles(establishment_id,submitted_by,profile)
   SELECT establishment_id,$2::uuid,$3::text::jsonb FROM owner
   ON CONFLICT(establishment_id) DO UPDATE SET profile=EXCLUDED.profile RETURNING establishment_id
  ),hours_saved AS (
   INSERT INTO radar.business_details(establishment_id,updated_by,hours)
   SELECT establishment_id,$2::uuid,$3::text::jsonb->'hours' FROM saved
   ON CONFLICT(establishment_id) DO UPDATE SET hours=EXCLUDED.hours,updated_by=EXCLUDED.updated_by,updated_at=now()
   RETURNING establishment_id
  ) INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
  SELECT $2::uuid,'USER','RADAR_COMMERCIAL_PROFILE_UPDATED','radar_establishment',establishment_id::text,
   '{"publicProfileUpdated":true}'::jsonb FROM saved RETURNING entity_id`,[id,account,JSON.stringify(profile)]);
  return rows.length===1?'UPDATED':'OWNER_REQUIRED';
 }
};}
