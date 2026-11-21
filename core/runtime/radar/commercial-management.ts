import {validateRegistrationProfile} from './registration';
import {validateBusiness} from './business';
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createCommercialManagement(db:Database,catalog?:{lookup(id:string,activeOnly?:boolean):Promise<string|undefined>}){return {
 async inspect(id:string,account:string){
  const rows=await db.unsafe(`SELECT e.id,e.name,e.category,p.profile,d.quantity,d.unit,
   (o.account_ref IS NOT NULL) AS verified
   FROM radar.establishments e
   LEFT JOIN radar.verified_owners o ON o.establishment_id=e.id AND o.account_ref=$2::uuid
   LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
   LEFT JOIN radar.business_details d ON d.establishment_id=e.id AND d.updated_by=$2::uuid
   WHERE e.id=$1::uuid AND e.published AND
   (o.account_ref IS NOT NULL OR p.submitted_by=$2::uuid)`,[id,account]);
  const item=rows[0];if(!item)return null;const configuredUnit=await catalog?.lookup(item.category);
  return {...item,...(configuredUnit?{configuredUnit}:{}),canManage:true};
 },
 async updateSubmitted(id:string,account:string,input:unknown,availability?:unknown){
  const item=await this.inspect(id,account);if(!item||item.verified||!item.profile)return 'OWNER_REQUIRED';
  const profile=validateRegistrationProfile(input,item.category,item.configuredUnit);if(!profile)return 'INVALID_PROFILE';
  const capacity=availability===undefined?null:validateBusiness(availability&&typeof availability==='object'?{...availability,hours:profile.hours}:null);
  if(availability!==undefined&&!capacity)return 'INVALID_PROFILE';
  const rows=await db.unsafe(`WITH saved AS (
   UPDATE radar.registration_profiles p SET profile=$3::text::jsonb
   FROM radar.establishments e WHERE p.establishment_id=e.id
   AND e.id=$1::uuid AND e.published AND p.submitted_by=$2::uuid
   AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)
   RETURNING e.id
  ),details AS (
   INSERT INTO radar.business_details(establishment_id,updated_by,hours,quantity,unit)
   SELECT id,$2::uuid,$3::text::jsonb->'hours',$4::int,$5::text FROM saved WHERE $6::boolean
   ON CONFLICT(establishment_id) DO UPDATE SET hours=EXCLUDED.hours,quantity=EXCLUDED.quantity,
    unit=EXCLUDED.unit,updated_by=EXCLUDED.updated_by,updated_at=now()
   RETURNING establishment_id
  ) INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
   SELECT $2::uuid,'USER','RADAR_SUBMITTED_PROFILE_UPDATED','radar_establishment',id::text,
   jsonb_build_object('publicProfileUpdated',true,'availabilityUpdated',$6::boolean,'ownershipGranted',false)
   FROM saved RETURNING entity_id`,[id,account,JSON.stringify(profile),capacity?.quantity??null,capacity?.unit??'units',capacity!==null]);
  return rows.length===1?'UPDATED':'OWNER_REQUIRED';
 },
 async updateAvailability(id:string,account:string,quantity:unknown){
  if(quantity!==null&&(!Number.isInteger(quantity)||Number(quantity)<0||Number(quantity)>100000))return 'INVALID_QUANTITY';
  // A registered business submitter or separately verified owner may manage availability,
  // without acquiring the independent verified ownership badge.
  const rows=await db.unsafe(`WITH managed AS MATERIALIZED (
   SELECT e.id AS establishment_id,$2::uuid AS account_ref,p.profile
   FROM radar.establishments e
   LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id
   LEFT JOIN radar.verified_owners o ON o.establishment_id=e.id AND o.account_ref=$2::uuid
   WHERE e.id=$1::uuid AND e.published AND
    (p.submitted_by=$2::uuid OR o.account_ref IS NOT NULL)
   FOR UPDATE OF e
  ),saved AS (
   INSERT INTO radar.business_details(establishment_id,updated_by,hours,quantity,unit)
   SELECT establishment_id,account_ref,COALESCE(profile->'hours','{}'::jsonb),$3::int,
    COALESCE(NULLIF(profile->'capacity'->>'unit',''),'units') FROM managed
   ON CONFLICT(establishment_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now(),updated_by=EXCLUDED.updated_by
   RETURNING establishment_id
  ) INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,metadata)
   SELECT $2::uuid,'USER','RADAR_AVAILABILITY_UPDATED','radar_establishment',establishment_id::text,
    '{"quantityUpdated":true,"ownershipGranted":false}'::jsonb FROM saved RETURNING entity_id`,[id,account,quantity]);
  return rows.length===1?'UPDATED':'OWNER_REQUIRED';
 },
 async update(id:string,account:string,input:unknown,availability?:unknown){
  const item=await this.inspect(id,account);if(!item)return 'OWNER_REQUIRED';
  const profile=validateRegistrationProfile(input,item.category,item.configuredUnit);if(!profile)return 'INVALID_PROFILE';
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
