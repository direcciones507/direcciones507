import type {Establishment} from "./public-map";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createRadarCampaignLookup(db:Database,enabled=false){
 return async(ids:string[],now=Date.now()):Promise<Map<string,NonNullable<Establishment["campaign"]>>>=>{
  const result=new Map<string,NonNullable<Establishment["campaign"]>>();
  if(!enabled||!ids.length||!Number.isFinite(now))return result;
  const rows=await db.unsafe(`SELECT DISTINCT ON (c.establishment_id) c.establishment_id::text AS id,c.kind,c.starts_at,c.ends_at
   FROM radar.campaigns c JOIN radar.establishments e ON e.id=c.establishment_id
   WHERE e.published AND c.establishment_id=ANY($1::uuid[]) AND c.status='APPROVED'
   AND c.starts_at<=$2::timestamptz AND c.ends_at>$2::timestamptz
   ORDER BY c.establishment_id,CASE WHEN c.kind='featured' THEN 0 ELSE 1 END,c.starts_at DESC,c.id`,[ids,new Date(now).toISOString()]);
  for(const row of rows)result.set(row.id,{kind:row.kind,startsAt:new Date(row.starts_at).getTime(),endsAt:new Date(row.ends_at).getTime()});
  return result;
 };
}
