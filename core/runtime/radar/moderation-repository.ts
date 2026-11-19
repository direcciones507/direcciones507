import type {ModerationStore} from "./moderation";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createModerationStore(db:Database):ModerationStore {
 return {
  async pending(limit){
   const safeLimit=Number.isInteger(limit)?Math.max(1,Math.min(100,limit)):100;
   const rows=await db.unsafe("SELECT id,name,category,country,latitude,longitude FROM radar.establishments WHERE NOT published ORDER BY created_at,id LIMIT $1",[safeLimit]);
   return rows.map(r=>({id:r.id,name:r.name,category:r.category,country:r.country,latitude:Number(r.latitude),longitude:Number(r.longitude)}));
  },
  async publish(id){
   const rows=await db.unsafe("UPDATE radar.establishments SET published=true WHERE id=$1::uuid AND NOT published RETURNING id",[id]);
   return rows.length===1;
  }
 };
}
