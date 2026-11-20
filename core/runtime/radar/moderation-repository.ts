import type {ModerationStore} from "./moderation";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createModerationStore(db:Database):ModerationStore {
 return {
  async pending(limit){
   const safeLimit=Number.isInteger(limit)?Math.max(1,Math.min(100,limit)):100;
   const rows=await db.unsafe("SELECT id,name,category,country,latitude,longitude FROM radar.establishments WHERE NOT published ORDER BY created_at,id LIMIT $1",[safeLimit]);
   return rows.map(r=>({id:r.id,name:r.name,category:r.category,country:r.country,latitude:Number(r.latitude),longitude:Number(r.longitude)}));
  },
  async verifyOwner(id,accountRef,adminRef){
   const rows=await db.unsafe(`INSERT INTO radar.verified_owners(establishment_id,account_ref,verified_by)
    SELECT e.id,u.id,a.id FROM radar.establishments e
    JOIN ad507.users u ON u.id=$2::uuid
    JOIN ad507.users a ON a.id=$3::uuid
    WHERE e.id=$1::uuid AND e.published
    ON CONFLICT (establishment_id) DO NOTHING RETURNING establishment_id`,[id,accountRef,adminRef]);
   return rows.length===1;
  },
  async revokeOwner(id,accountRef){
   const rows=await db.unsafe("DELETE FROM radar.verified_owners WHERE establishment_id=$1::uuid AND account_ref=$2::uuid RETURNING establishment_id",[id,accountRef]);
   return rows.length===1;
  },
  async publish(id){
   const rows=await db.unsafe("UPDATE radar.establishments SET published=true WHERE id=$1::uuid AND NOT published RETURNING id",[id]);
   return rows.length===1;
  }
 };
}
