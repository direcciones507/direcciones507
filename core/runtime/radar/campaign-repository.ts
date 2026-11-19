import type {Establishment} from "./public-map";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export function createRadarCampaignLookup(db:Database,enabled=false){
 return async(ids:string[],now=Date.now()):Promise<Map<string,NonNullable<Establishment["campaign"]>>>=>{
  const result=new Map<string,NonNullable<Establishment["campaign"]>>();
  if(!enabled||!ids.length||!Number.isFinite(now))return result;
  const rows=await db.unsafe(`SELECT c.establishment_id::text AS id,c.kind,c.starts_at,c.ends_at
   FROM radar.campaigns c JOIN radar.establishments e ON e.id=c.establishment_id
   WHERE e.published AND c.establishment_id=ANY(string_to_array($1::text, chr(44))::uuid[]) AND c.status='APPROVED'
   AND c.starts_at<=$2::timestamptz AND c.ends_at>$2::timestamptz
   ORDER BY c.establishment_id,CASE WHEN c.kind='live' THEN 0 ELSE 1 END,c.starts_at DESC,c.id`,[ids.join(","),new Date(now).toISOString()]);
  for(const row of rows){const end=new Date(row.ends_at).getTime();const existing=result.get(row.id);if(!existing){result.set(row.id,{kind:row.kind,startsAt:new Date(row.starts_at).getTime(),endsAt:end});}else{const key=row.kind==='featured'?'featuredUntil':'liveUntil';existing[key]=Math.max(existing[key]??(existing.kind===row.kind?existing.endsAt:0),end);}}
  return result;
 };
}
