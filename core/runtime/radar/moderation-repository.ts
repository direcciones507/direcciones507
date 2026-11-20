import type {ModerationStore} from "./moderation";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createModerationStore(db:Database,requireRequest=false):ModerationStore {
 return {
  async pending(limit){
   const safeLimit=Number.isInteger(limit)?Math.max(1,Math.min(100,limit)):100;
   const rows=await db.unsafe("SELECT id,name,category,country,latitude,longitude FROM radar.establishments WHERE NOT published ORDER BY created_at,id LIMIT $1",[safeLimit]);
   return rows.map(r=>({id:r.id,name:r.name,category:r.category,country:r.country,latitude:Number(r.latitude),longitude:Number(r.longitude)}));
  },
  async verifyOwner(id,accountRef,adminRef){
   const rows=await db.unsafe(`WITH verified AS (INSERT INTO radar.verified_owners(establishment_id,account_ref,verified_by)
    SELECT e.id,u.id,a.id FROM radar.establishments e
    JOIN ad507.users u ON u.id=$2::uuid
    JOIN ad507.users a ON a.id=$3::uuid
    WHERE e.id=$1::uuid AND e.published
    ${requireRequest?'AND EXISTS(SELECT 1 FROM radar.ownership_requests r WHERE r.establishment_id=e.id AND r.account_ref=u.id)':''}
    ON CONFLICT (establishment_id) DO NOTHING RETURNING establishment_id,account_ref)
    INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,after_json)
    SELECT $3::uuid,'ADMIN','RADAR_OWNER_VERIFIED','radar_establishment',establishment_id::text,
    jsonb_build_object('accountRef',account_ref,'evidenceReviewed',true) FROM verified
    RETURNING entity_id AS establishment_id`,[id,accountRef,adminRef]);
   return rows.length===1;
  },
  async revokeOwner(id,accountRef,adminRef){
   const rows=await db.unsafe(`WITH revoked AS (DELETE FROM radar.verified_owners
    WHERE establishment_id=$1::uuid AND account_ref=$2::uuid RETURNING establishment_id,account_ref)
    INSERT INTO ad507.audit_log(actor_user_id,actor_type,action,entity_type,entity_id,before_json)
    SELECT $3::uuid,'ADMIN','RADAR_OWNER_REVOKED','radar_establishment',establishment_id::text,
    jsonb_build_object('accountRef',account_ref) FROM revoked RETURNING entity_id AS establishment_id`,[id,accountRef,adminRef]);
   return rows.length===1;
  },
  async publish(id){
   const rows=await db.unsafe("UPDATE radar.establishments SET published=true WHERE id=$1::uuid AND NOT published RETURNING id",[id]);
   return rows.length===1;
  }
 };
}
